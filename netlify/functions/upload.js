const { Pinecone } = require('@pinecone-database/pinecone')
const { v4: uuidv4 } = require('uuid')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Helper function to split text into chunks
function splitText(text, chunkSize = 1000, overlap = 200) {
  console.log(`✂️ 텍스트 분할 시작: ${text.length}자 (청크 크기: ${chunkSize}, 겹침: ${overlap})`)
  const chunks = []
  let start = 0
  
  while (start < text.length) {
    let end = start + chunkSize
    
    // If this isn't the last chunk, try to break at a sentence or word boundary
    if (end < text.length) {
      const lastSentence = text.lastIndexOf('.', end)
      const lastSpace = text.lastIndexOf(' ', end)
      
      if (lastSentence > start + chunkSize * 0.7) {
        end = lastSentence + 1
      } else if (lastSpace > start + chunkSize * 0.7) {
        end = lastSpace
      }
    }
    
    const chunkText = text.slice(start, end).trim()
    chunks.push({
      text: chunkText,
      start,
      end: Math.min(end, text.length)
    })
    
    console.log(`📝 청크 ${chunks.length}: ${start}-${Math.min(end, text.length)} (${chunkText.length}자)`)
    
    start = Math.max(start + 1, end - overlap)
  }
  
  console.log(`📊 텍스트 분할 완료: ${chunks.length}개 청크 생성`)
  return chunks
}

// Helper function to generate embeddings
async function generateEmbeddings(texts, apiKey) {
  console.log(`🔮 임베딩 생성 시작: ${texts.length}개 텍스트`)
  const embeddings = []
  
  // Process in batches to avoid rate limits
  const batchSize = 5
  const totalBatches = Math.ceil(texts.length / batchSize)
  console.log(`📊 배치 처리: ${totalBatches}개 배치 (배치당 ${batchSize}개)`)
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    
    console.log(`⚡ 배치 ${batchNum}/${totalBatches} 처리 중... (${batch.length}개 텍스트)`)
    
    const response = await fetch('https://api.upstage.ai/v1/solar/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'solar-embedding-1-large-passage',
        input: batch
      })
    })
    
    console.log(`📞 Solar API 응답: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Solar API 오류 [${response.status}]:`, errorText)
      throw new Error(`Embedding API error: ${response.status}`)
    }
    
    const data = await response.json()
    const batchEmbeddings = data.data.map(d => d.embedding)
    embeddings.push(...batchEmbeddings)
    
    console.log(`✅ 배치 ${batchNum} 완료: ${batchEmbeddings.length}개 임베딩 생성`)
    
    // Add delay between batches
    if (i + batchSize < texts.length) {
      console.log('⏳ 다음 배치 전 1초 대기...')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  console.log(`🏆 임베딩 생성 완료: 총 ${embeddings.length}개`)
  return embeddings
}

exports.handler = async (event, context) => {
  console.log('🚀 Upload function 시작')
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('📋 CORS preflight 요청 처리')
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    console.log('❌ POST가 아닌 요청:', event.httpMethod)
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    console.log('🔧 환경 변수 확인 중...')
    // Check required environment variables
    const solarApiKey = process.env.UPSTAGE_API_KEY
    const pineconeApiKey = process.env.PINECONE_API_KEY
    const pineconeIndex = process.env.PINECONE_INDEX

    if (!solarApiKey) {
      console.error('❌ UPSTAGE_API_KEY가 설정되지 않음')
      throw new Error('UPSTAGE_API_KEY not configured')
    }

    if (!pineconeApiKey || !pineconeIndex) {
      console.error('❌ Pinecone 설정이 누락됨')
      throw new Error('Pinecone configuration missing')
    }

    console.log('✅ 환경 변수 확인 완료')

    // Parse JSON body (text is already extracted on client side)
    const { fileName, fileSize, extractedText } = JSON.parse(event.body)
    console.log(`📄 파일 정보: ${fileName} (${fileSize} bytes)`)
    console.log(`📝 추출된 텍스트 길이: ${extractedText?.length || 0}자`)
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.error('❌ 텍스트 내용이 비어있음')
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No text content provided' })
      }
    }

    const documentId = uuidv4()
    const fullText = extractedText
    console.log(`🆔 문서 ID 생성: ${documentId}`)

    // 2. Split text into chunks
    console.log('✂️ 텍스트 청크 분할 시작...')
    const chunks = splitText(fullText, 1000, 200)
    console.log(`✅ ${chunks.length}개 청크 생성 완료`)

    // 3. Generate embeddings for each chunk
    console.log('🧠 임베딩 생성 시작...')
    const chunkTexts = chunks.map(chunk => chunk.text)
    const embeddings = await generateEmbeddings(chunkTexts, solarApiKey)
    console.log(`✅ ${embeddings.length}개 임베딩 생성 완료`)

    // 4. Store in Pinecone
    console.log('💾 Pinecone 저장 시작...')
    const pinecone = new Pinecone({
      apiKey: pineconeApiKey
    })

    const index = pinecone.index(pineconeIndex)
    console.log(`🔗 Pinecone 인덱스 연결: ${pineconeIndex}`)
    
    // Prepare vectors for upsert
    const vectors = chunks.map((chunk, i) => ({
      id: `${documentId}-chunk-${i}`,
      values: embeddings[i],
      metadata: {
        documentId,
        fileName: fileName,
        text: chunk.text,
        chunkIndex: i,
        startPosition: chunk.start,
        endPosition: chunk.end,
        totalChunks: chunks.length
      }
    }))

    console.log(`📦 ${vectors.length}개 벡터 준비 완료`)

    // Upsert vectors in batches
    const batchSize = 100
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize)
      console.log(`📤 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)} 업로드 중... (${batch.length}개 벡터)`)
      await index.upsert(batch)
    }

    console.log('✅ Pinecone 저장 완료')

    const result = {
      documentId,
      fileName: fileName,
      totalChunks: chunks.length,
      totalTokens: fullText.length,
      status: 'completed'
    }

    console.log('🎉 Upload function 성공 완료:', result)

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    }

  } catch (error) {
    console.error('💥 Upload function 오류:', error)
    console.error('오류 스택:', error.stack)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    }
  }
}