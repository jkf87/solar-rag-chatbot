import { Pinecone } from '@pinecone-database/pinecone'
import formidable from 'formidable'
import fs from 'fs'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { v4 as uuidv4 } from 'uuid'
import { NextRequest, NextResponse } from 'next/server'

// Node.js runtime 사용 (pdfjs-dist에서도 안정성을 위해)
export const runtime = 'nodejs'

// Configure PDF.js worker for Node.js environment
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

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
        model: 'solar-embedding-1-large-passage',
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

export async function OPTIONS() {
  return new NextResponse('', { status: 200, headers: corsHeaders })
}

export async function POST(request) {
  try {
    // Check required environment variables
    const solarApiKey = process.env.UPSTAGE_API_KEY
    const pineconeApiKey = process.env.PINECONE_API_KEY
    const pineconeIndex = process.env.PINECONE_INDEX

    if (!solarApiKey) {
      return NextResponse.json(
        { error: 'UPSTAGE_API_KEY not configured' },
        { status: 500, headers: corsHeaders }
      )
    }

    if (!pineconeApiKey || !pineconeIndex) {
      return NextResponse.json(
        { error: 'Pinecone configuration missing' },
        { status: 500, headers: corsHeaders }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file || !file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'No PDF file uploaded' },
        { status: 400, headers: corsHeaders }
      )
    }

    const documentId = uuidv4()

    // 1. Extract text from PDF using pdfjs-dist
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    const loadingTask = getDocument({ data: uint8Array })
    const pdfDocument = await loadingTask.promise
    
    let fullText = ''
    const numPages = pdfDocument.numPages
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n'
    }

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF' },
        { status: 400, headers: corsHeaders }
      )
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
        fileName: file.name,
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

    return NextResponse.json({
      documentId,
      fileName: file.name,
      totalChunks: chunks.length,
      totalTokens: fullText.length,
      status: 'completed'
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500, headers: corsHeaders }
    )
  }
} 