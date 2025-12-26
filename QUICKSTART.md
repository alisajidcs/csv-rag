## 🚀 How to Use

### 1. Start the Server

```bash
npm run start:dev
```

The server will run on `http://localhost:3000`

### 2. Test with the Web UI

Open `chat-client.html` in your browser. You can:

- Click example questions
- Type custom queries
- Adjust settings (Top K, Max Tokens, Temperature)

### 3. Test with API Calls

#### Non-Streaming Endpoint (Recommended for testing):

```bash
curl -X POST http://localhost:3000/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the import records for live animals?",
    "topK": 5
  }'
```

**Response:**

```json
{
  "response": "Based on the trade data...",
  "contextsUsed": 5,
  "responseTime": 2340
}
```

#### Streaming Endpoint (SSE):

```bash
curl -N -X POST http://localhost:3000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me imports from Dubai"
  }'
```

## 📊 API Endpoints

### POST `/chat/query`

Returns complete response in single request

- Good for: Testing, simple integrations
- Returns: JSON with full response

### POST `/chat/stream`

Returns Server-Sent Events stream

- Good for: Real-time UX, long responses
- Returns: SSE stream with tokens

## ⚙️ Configuration

Environment variables in `.env`:

```env
# Groq LLM
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Ollama for Embeddings
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text

# ChromaDB
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=excel_data
```

## 🔍 How It Works

1. **User Question** → Converted to embedding using Ollama
2. **Vector Search** → ChromaDB finds similar documents
3. **Context Building** → Retrieved docs formatted as context
4. **LLM Response** → Groq generates answer based on context
5. **Streaming** → Response streamed back in real-time

## 🎯 Parameters

### Request Body:

- `message` (required): User's question
- `topK` (optional, default: 5): Number of similar documents to retrieve
- `maxTokens` (optional, default: 1000): Max response length
- `temperature` (optional, default: 0.7): Response creativity (0.0-2.0)

### Tips:

- Lower temperature (0.1-0.3) for factual queries
- Higher temperature (0.7-1.0) for creative responses
- Increase topK for broader context

## 🧪 Testing Checklist

- [ ] Embeddings are created (`POST /embeddings/embed`)
- [ ] ChromaDB has data (`GET /embeddings/stats`)
- [ ] Server is running (`npm run start:dev`)
- [ ] Test non-streaming endpoint first
- [ ] Try example questions
- [ ] Test with custom queries

## 🔧 Troubleshooting

**"GROQ_API_KEY not found"**

- Add your Groq API key to `.env`

**"No relevant data found"**

- Ensure embeddings are created
- Check ChromaDB is running
- Verify collection has data

**Empty responses**

- Check Groq API quota
- Try lower topK value
- Increase maxTokens

## 📚 API Documentation

See `CHAT_API.md` for detailed API documentation with more examples.
