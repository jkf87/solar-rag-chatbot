const { Pinecone } = require('@pinecone-database/pinecone')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const { message, history } = JSON.parse(event.body)

    if (!message) {
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

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API error: ${embeddingResponse.status}`)
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // 2. Search similar documents in Pinecone
    let sources = []
    const pineconeApiKey = process.env.PINECONE_API_KEY
    const pineconeIndex = process.env.PINECONE_INDEX

    if (pineconeApiKey && pineconeIndex) {
      try {
        const pinecone = new Pinecone({
          apiKey: pineconeApiKey
        })

        const index = pinecone.index(pineconeIndex)
        const searchResults = await index.query({
          vector: queryEmbedding,
          topK: 5,
          includeMetadata: true
        })

        sources = searchResults.matches.map(match => ({
          content: match.metadata?.text || '',
          score: match.score,
          page: match.metadata?.page
        }))
      } catch (pineconeError) {
        console.warn('Pinecone search failed:', pineconeError)
        // Continue without sources
      }
    }

    // 3. Build context from retrieved documents
    const context = sources.length > 0 
      ? sources.map(s => s.content).join('\n\n')
      : 'No relevant documents found.'

    // 4. Generate response using Solar LLM
    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context. If the context doesn't contain relevant information, say so honestly.

Context:
${context}

Please provide a comprehensive answer based on the context above.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ]

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

    if (!chatResponse.ok) {
      throw new Error(`Chat API error: ${chatResponse.status}`)
    }

    const chatData = await chatResponse.json()
    const response = chatData.choices[0].message.content

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        response,
        sources: sources.filter(s => s.score > 0.7) // Only return high-confidence sources
      })
    }

  } catch (error) {
    console.error('Chat function error:', error)
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