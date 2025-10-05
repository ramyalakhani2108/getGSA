# GetGSA - Government Contract Document Processing System

A production-ready Node.js application that processes GSA onboarding documents using AI and RAG (Retrieval-Augmented Generation) to extract, validate, and redact sensitive information while maintaining compliance.

## 🚀 Features

- **Intelligent Document Processing**: Automatic classification of company profiles, past performance, and pricing sheets
- **AI-Powered Analysis**: Uses Ollama (llama3.2) for document understanding and field extraction
- **RAG Integration**: Simple in-memory vector store for rule retrieval and compliance checking
- **PII Redaction**: Comprehensive redaction of emails, phone numbers, and SSNs
- **Compliance Validation**: Automated GSA rule compliance checking with citations
- **Report Generation**: Auto-generated negotiation briefs and client emails
- **Modern UI**: Clean, responsive web interface with real-time processing status
- **100% Free Stack**: No paid services required - completely free to deploy and run

## 📋 Prerequisites

- **Node.js** 18.x or 20.x LTS ([Download](https://nodejs.org/)) ⚠️ **Not v23+** - See [NODE_VERSION.md](NODE_VERSION.md)
- **Ollama** (for AI processing) ([Install](https://ollama.ai/))
- **Git** (for cloning)

## 🛠️ Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd getGSA

# IMPORTANT: Use Node.js v20 (see NODE_VERSION.md for details)
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"  # macOS with Homebrew

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### 2. Install and Configure Ollama

```bash
# Install Ollama (if not already installed)
# macOS/Linux:
curl -L https://ollama.ai/install.sh | sh

# Pull the llama3.2 model
ollama pull llama3.2

# Start Ollama server (if not running)
ollama serve
```

### 3. Initialize Database and Vector Store

```bash
# Run migrations (creates SQLite database)
npm run migrate

# Seed vector store with GSA rules (optional, done automatically on first run)
npm run seed
```

### 4. Start Development Server

```bash
# Option 1: Use the dev script (handles Node version automatically)
./dev.sh

# Option 2: Manual start (ensure Node v20 is in PATH)
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. Build for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# The application will be available at http://localhost:3000
# Ollama will be available at http://localhost:11434
```

## 📁 Project Structure

```
getGSA/
├── src/
│   ├── db/                    # Database layer
│   │   ├── database.ts        # Database initialization and schema
│   │   └── repositories.ts    # Data access layer
│   ├── middleware/            # Express middleware
│   │   └── errorHandler.ts   # Error handling
│   ├── routes/                # API endpoints
│   │   ├── analyze.ts         # Document analysis endpoint
│   │   ├── health.ts          # Health check endpoint
│   │   └── ingest.ts          # Document ingestion endpoint
│   ├── services/              # Business logic
│   │   ├── aiService.ts       # AI/LLM integration
│   │   ├── documentParser.ts # Document parsing
│   │   ├── redaction.ts       # PII redaction
│   │   └── vectorStore.ts     # Simple in-memory RAG vector store
│   ├── utils/                 # Utilities
│   │   └── logger.ts          # Logging configuration
│   └── server.ts              # Express server setup
├── public/                    # Frontend files
│   ├── index.html            # Main UI
│   └── app.js                # Frontend JavaScript
├── data/                      # Data directory (auto-created)
│   ├── getgsa.db             # SQLite database
│   └── data/                  # SQLite database (no ChromaDB needed)
├── logs/                      # Application logs
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md       # System architecture
│   ├── PROMPTS.md            # LLM prompts
│   └── SECURITY.md           # Security documentation
└── tests/                     # Test files

```

## 🔌 API Endpoints

### POST /api/ingest
Ingest and redact a document.

**Request:**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "document=@company-profile.pdf"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "requestId": "uuid",
    "documentId": "uuid",
    "filename": "company-profile.pdf",
    "redactionCount": 5,
    "redactionsByType": {
      "email": 2,
      "phone": 2,
      "ssn": 1
    }
  }
}
```

### POST /api/analyze
Analyze an ingested document.

**Request:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"request_id": "uuid"}'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "analysisId": "uuid",
    "classification": {
      "documentType": "company_profile",
      "confidence": 0.95
    },
    "extractedFields": { ... },
    "rag": {
      "rulesRetrieved": 5,
      "ruleCitations": ["R1", "R2", ...]
    },
    "compliance": {
      "checklist": [ ... ],
      "compliantCount": 3,
      "nonCompliantCount": 2
    },
    "outputs": {
      "negotiationBrief": "...",
      "clientEmail": "..."
    }
  }
}
```

### GET /api/healthz
System health check.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "database": true,
    "ai": true,
    "vectorStore": true
  },
  "version": "1.0.0"
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## 📊 GSA Rules Compliance

The system validates documents against 5 GSA rules:

- **R1**: Unique Entity Identifier (UEI) Requirement - Critical
- **R2**: NAICS Code to SIN Mapping - High
- **R3**: Past Performance Contract Value Threshold ($25,000) - High
- **R4**: Pricing Sheet Labor Category Requirements - Medium
- **R5**: PII Redaction Requirements - Critical

## 🔒 Security

- All PII is redacted before AI processing
- Secure hash storage for audit trails
- Rate limiting on API endpoints
- Input validation and sanitization
- Helmet.js security headers
- CORS protection

See [SECURITY.md](docs/SECURITY.md) for details.

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read the contribution guidelines first.

## 📧 Support

For issues or questions, please open a GitHub issue.

## 🎯 Project Status

This is a coding test project demonstrating advanced full-stack development with AI integration.

**Key Technologies:**
- Node.js + TypeScript
- Express.js
- SQLite + ChromaDB
- Ollama (llama3.2)
- Vanilla JavaScript + TailwindCSS

**100% Free to Deploy and Run** ✨
