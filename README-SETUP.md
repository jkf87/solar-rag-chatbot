# Solar RAG Chatbot

A modern React-based RAG (Retrieval-Augmented Generation) chatbot using Solar LLM and Pinecone, deployed on Netlify.

## Features

- 📄 PDF document upload and processing
- 🤖 Solar LLM integration for chat completions
- 🔍 Semantic search with Pinecone vector database
- ⚡ Serverless architecture with Netlify Functions
- 🎨 Modern UI with Tailwind CSS and shadcn/ui
- 📱 Responsive design

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Lucide React** for icons

### Backend
- **Netlify Functions** (serverless)
- **Solar LLM** (Upstage) for embeddings and chat
- **Pinecone** for vector storage
- **PDF-Parse** for document processing

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd solar-rag-chatbot
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required environment variables:
- `UPSTAGE_API_KEY`: Your Solar LLM API key from Upstage
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_INDEX`: Your Pinecone index name

### 3. Pinecone Setup

1. Create a Pinecone account at [pinecone.io](https://pinecone.io)
2. Create a new index with:
   - **Dimensions**: 1024 (for Solar embeddings)
   - **Metric**: cosine
   - **Cloud**: AWS (recommended)
   - **Region**: us-east-1 (recommended)

### 4. Solar LLM Setup

1. Get your API key from [Upstage Console](https://console.upstage.ai)
2. The app uses:
   - `solar-1-mini-embedding` for document embeddings
   - `solar-1-mini-chat` for chat completions

### 5. Local Development

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start development server
netlify dev
```

This will start:
- Next.js app on `http://localhost:3000`
- Netlify Functions on `http://localhost:8888/.netlify/functions/`

### 6. Deploy to Netlify

1. **Connect to Git**: Push your code to GitHub/GitLab
2. **Import to Netlify**: 
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Select your repository
3. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `out`
   - Functions directory: `netlify/functions`
4. **Set Environment Variables**:
   - Go to Site Settings > Environment Variables
   - Add all the environment variables from your `.env.local`

## Usage

### 1. Upload Documents
- Click on the "Files" tab in the sidebar
- Drag & drop PDF files or click to select
- Wait for processing to complete

### 2. Chat with Documents
- Type your questions in the chat interface
- The system will search relevant document chunks
- Get AI-powered answers based on your documents

### 3. Monitor Usage
- Check the "Settings" tab for token usage and costs
- Adjust RAG parameters like chunk size and top-k results

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │───▶│ Netlify Functions│───▶│   Solar LLM     │
│                 │    │                 │    │   (Upstage)     │
│  - PDF Upload   │    │  - chat.js      │    │                 │
│  - Chat UI      │    │  - upload.js    │    └─────────────────┘
│  - File Manager │    │                 │    
└─────────────────┘    │  - PDF Process  │    ┌─────────────────┐
                       │  - Embedding    │───▶│   Pinecone      │
                       │  - Vector DB    │    │  Vector Store   │
                       │  - RAG Logic    │    │                 │
                       └─────────────────┘    └─────────────────┘
```

## Data Flow

### Document Upload Flow
1. User uploads PDF → Frontend
2. PDF sent to `/api/upload` → Netlify Function
3. Extract text from PDF → pdf-parse
4. Split text into chunks → Custom chunking logic
5. Generate embeddings → Solar LLM API
6. Store vectors → Pinecone
7. Return success → Frontend

### Chat Flow
1. User asks question → Frontend
2. Question sent to `/api/chat` → Netlify Function
3. Generate query embedding → Solar LLM API
4. Search similar chunks → Pinecone
5. Build context with retrieved chunks
6. Generate response → Solar LLM API
7. Return answer + sources → Frontend

## Cost Optimization

- **Chunk Size**: 1000 characters (configurable)
- **Overlap**: 200 characters to preserve context
- **Top-K**: 5 most relevant chunks
- **Embedding Caching**: Prevents re-processing same documents
- **Batch Processing**: Efficient API usage

## Customization

### RAG Parameters
Edit the serverless functions to adjust:
- Chunk size and overlap
- Number of retrieved documents (top-k)
- Similarity threshold
- Temperature for response generation

### UI Customization
- Modify components in `src/components/`
- Update styles in `src/app/globals.css`
- Add new features in the sidebar tabs

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all environment variables are set
   - Ensure Node.js version is 18+

2. **Function Errors**
   - Check Netlify function logs
   - Verify API keys are correct
   - Ensure Pinecone index exists and is accessible

3. **PDF Upload Issues**
   - Check file size (10MB limit)
   - Ensure file is a valid PDF
   - Verify text extraction is working

### Development Tips

- Use `netlify dev` for local testing with functions
- Check browser console for frontend errors
- Monitor Netlify function logs for backend issues
- Test with small PDF files first

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details