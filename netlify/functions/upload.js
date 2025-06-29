const { Pinecone } = require('@pinecone-database/pinecone')
const formidable = require('formidable')
const fs = require('fs')
const path = require('path')
const pdfParse = require('pdf-parse')
const { v4: uuidv4 } = require('uuid')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Helper function to split text into chunks
function splitText(text, chunkSize = 1000, overlap = 200) {
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
    
    chunks.push({
      text: text.slice(start, end).trim(),
      start,
      end: Math.min(end, text.length)
    })
    
    start = Math.max(start + 1, end - overlap)
  }
  
  return chunks
}

// Helper function to generate embeddings
async function generateEmbeddings(texts, apiKey) {
  const embeddings = []
  
  // Process in batches to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    
    const response = await fetch('https://api.upstage.ai/v1/solar/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'solar-1-mini-embedding',
        input: batch
      })
    })
    
    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`)
    }
    
    const data = await response.json()
    embeddings.push(...data.data.map(d => d.embedding))
    
    // Add delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return embeddings
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Check required environment variables
    const solarApiKey = process.env.UPSTAGE_API_KEY
    const pineconeApiKey = process.env.PINECONE_API_KEY
    const pineconeIndex = process.env.PINECONE_INDEX

    if (!solarApiKey) {
      throw new Error('UPSTAGE_API_KEY not configured')
    }

    if (!pineconeApiKey || !pineconeIndex) {
      throw new Error('Pinecone configuration missing')
    }

    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      allowEmptyFiles: false,
      filter: function ({ name, originalFilename, mimetype }) {
        return mimetype && mimetype.includes('pdf')
      }
    })

    const [fields, files] = await form.parse(event.body)
    
    if (!files.file || !files.file[0]) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No PDF file uploaded' })
      }
    }

    const file = files.file[0]
    const documentId = uuidv4()

    // 1. Extract text from PDF
    const pdfBuffer = fs.readFileSync(file.filepath)
    const pdfData = await pdfParse(pdfBuffer)
    const fullText = pdfData.text

    if (!fullText || fullText.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Could not extract text from PDF' })
      }
    }

    // 2. Split text into chunks
    const chunks = splitText(fullText, 1000, 200)
    console.log(`Created ${chunks.length} chunks from PDF`)

    // 3. Generate embeddings for each chunk
    const chunkTexts = chunks.map(chunk => chunk.text)
    const embeddings = await generateEmbeddings(chunkTexts, solarApiKey)

    // 4. Store in Pinecone
    const pinecone = new Pinecone({
      apiKey: pineconeApiKey
    })

    const index = pinecone.index(pineconeIndex)
    
    // Prepare vectors for upsert
    const vectors = chunks.map((chunk, i) => ({
      id: `${documentId}-chunk-${i}`,
      values: embeddings[i],
      metadata: {
        documentId,
        fileName: file.originalFilename,
        text: chunk.text,
        chunkIndex: i,
        startPosition: chunk.start,
        endPosition: chunk.end,
        totalChunks: chunks.length
      }
    }))

    // Upsert vectors in batches
    const batchSize = 100
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize)
      await index.upsert(batch)
    }

    // Clean up temporary file
    fs.unlinkSync(file.filepath)

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        documentId,
        fileName: file.originalFilename,
        totalChunks: chunks.length,
        totalTokens: fullText.length,
        status: 'completed'
      })
    }

  } catch (error) {
    console.error('Upload function error:', error)
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