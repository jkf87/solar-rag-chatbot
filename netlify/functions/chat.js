const { Pinecone } = require('@pinecone-database/pinecone')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

exports.handler = async (event, context) => {
  console.log('💬 Chat function 시작')
  
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
    const { message, history } = JSON.parse(event.body)
    console.log('📝 사용자 질문:', message)
    console.log('📚 대화 히스토리 길이:', history?.length || 0)

    if (!message) {
      console.log('❌ 메시지가 비어있음')
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Message is required' })
      }
    }

    // Initialize Solar LLM client
    const solarApiKey = process.env.UPSTAGE_API_KEY
    if (!solarApiKey) {
      throw new Error('UPSTAGE_API_KEY not configured')
    }

    // 1. Generate embedding for the user query
    console.log('🔮 질문 임베딩 생성 시작...')
    const embeddingResponse = await fetch('https://api.upstage.ai/v1/solar/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${solarApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'solar-embedding-1-large-query',
        input: message
      })
    })

    console.log('📞 임베딩 API 응답:', embeddingResponse.status)

    if (!embeddingResponse.ok) {
      console.error('❌ 임베딩 API 오류:', embeddingResponse.status)
      throw new Error(`Embedding API error: ${embeddingResponse.status}`)
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding
    console.log('✅ 질문 임베딩 생성 완료')

    // 2. Search similar documents in Pinecone
    console.log('🔍 벡터 검색 시작...')
    let sources = []
    const pineconeApiKey = process.env.PINECONE_API_KEY
    const pineconeIndex = process.env.PINECONE_INDEX

    if (pineconeApiKey && pineconeIndex) {
      try {
        const pinecone = new Pinecone({
          apiKey: pineconeApiKey
        })

        const index = pinecone.index(pineconeIndex)
        console.log(`🔗 Pinecone 인덱스 연결: ${pineconeIndex}`)
        
        const searchResults = await index.query({
          vector: queryEmbedding,
          topK: 5,
          includeMetadata: true
        })

        console.log(`📊 검색 결과: ${searchResults.matches.length}개 문서 발견`)
        
        sources = searchResults.matches.map(match => ({
          content: match.metadata?.text || '',
          score: match.score,
          page: match.metadata?.page
        }))

        console.log('🎯 검색된 문서들:')
        sources.forEach((source, i) => {
          console.log(`  ${i+1}. 점수: ${source.score.toFixed(3)}, 길이: ${source.content.length}자`)
        })

      } catch (pineconeError) {
        console.error('❌ Pinecone 검색 실패:', pineconeError)
        // Continue without sources
      }
    } else {
      console.log('⚠️ Pinecone 설정이 없어 검색 건너뜀')
    }

    // 3. Build context from retrieved documents
    console.log('📝 컨텍스트 생성 중...')
    const context = sources.length > 0 
      ? sources.map(s => s.content).join('\n\n')
      : 'No relevant documents found.'

    console.log(`📄 컨텍스트 길이: ${context.length}자`)
    console.log(`📋 사용할 소스 개수: ${sources.length}개`)

    // 4. Generate response using Solar LLM
    console.log('🤖 LLM 응답 생성 시작...')
    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context. If the context doesn't contain relevant information, say so honestly.

Context:
${context}

Please provide a comprehensive answer based on the context above.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ]

    console.log(`📨 메시지 개수: ${messages.length}개`)

    const chatResponse = await fetch('https://api.upstage.ai/v1/solar/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${solarApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'solar-pro2-preview',
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000
      })
    })

    console.log('📞 채팅 API 응답:', chatResponse.status)

    if (!chatResponse.ok) {
      console.error('❌ 채팅 API 오류:', chatResponse.status)
      throw new Error(`Chat API error: ${chatResponse.status}`)
    }

    const chatData = await chatResponse.json()
    const response = chatData.choices[0].message.content

    console.log('✅ 응답 생성 완료')
    console.log(`📝 응답 길이: ${response.length}자`)

    const filteredSources = sources.filter(s => s.score > 0.5) // Lowered from 0.7 to 0.5 for more results
    console.log(`🎯 고신뢰도 소스 개수: ${filteredSources.length}개 (임계값 0.5 이상)`)

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        response,
        sources: filteredSources // Only return high-confidence sources
      })
    }

  } catch (error) {
    console.error('💥 Chat function 오류:', error)
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