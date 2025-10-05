# System Architecture

## Overview

GetGSA is a document processing system that combines traditional backend services with modern AI capabilities to process government contract documents. The architecture follows a layered approach with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                    (Vanilla JS + HTML)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────┴──────────────────────────────────────┐
│                      API Layer                               │
│                   (Express.js + TypeScript)                  │
│  ┌─────────────┬─────────────┬────────────────┐            │
│  │  /ingest    │  /analyze   │   /healthz     │            │
│  └─────────────┴─────────────┴────────────────┘            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Document Parser │ PII Redaction │ AI Service    │       │
│  └──────────────────────────────────────────────────┘       │
└──────────────┬────────────────┬──────────────────┬──────────┘
               │                │                  │
     ┌─────────┴───┐    ┌───────┴────────┐  ┌─────┴──────┐
     │   SQLite    │    │   ChromaDB     │  │   Ollama   │
     │  (Metadata) │    │ (Vector Store) │  │    (AI)    │
     └─────────────┘    └────────────────┘  └────────────┘
```

## Component Details

### 1. Frontend Layer

**Technology:** Vanilla JavaScript, HTML5, TailwindCSS (CDN)

**Responsibilities:**
- Document upload interface (drag-drop + file picker)
- Real-time processing status display
- Results visualization
- Sample document management
- System health monitoring

**Key Features:**
- No build step required for development
- Responsive design with modern UI/UX
- Client-side file validation
- Progressive enhancement approach

### 2. API Layer

**Technology:** Express.js 4.x with TypeScript

**Endpoints:**

#### POST /api/ingest
- **Purpose:** Accept documents, perform PII redaction, store metadata
- **Flow:**
  1. Validate file type and size
  2. Parse document (PDF/DOCX/TXT)
  3. Redact PII (emails, phones, SSNs)
  4. Store in database with hash
  5. Return summary and request_id

#### POST /api/analyze
- **Purpose:** Classify and analyze documents using AI + RAG
- **Flow:**
  1. Retrieve redacted document by request_id
  2. Classify document type (LLM)
  3. Extract structured fields (LLM)
  4. Query relevant GSA rules (RAG)
  5. Generate compliance checklist
  6. Create negotiation brief and client email
  7. Return comprehensive analysis

#### GET /api/healthz
- **Purpose:** System health monitoring
- **Checks:** Database connectivity, AI service status, vector store

**Middleware Stack:**
- Helmet (security headers)
- CORS (cross-origin protection)
- Rate limiting (100 req/hour per IP)
- JSON body parser (10MB limit)
- Error handler (centralized)
- Request logger

### 3. Business Logic Layer

#### Document Parser Service
**File:** `src/services/documentParser.ts`

**Supported Formats:**
- PDF (via pdf-parse)
- DOCX (via mammoth)
- TXT (native)

**Features:**
- Automatic format detection
- Metadata extraction
- Error handling with detailed messages
- File size validation (10MB limit)
- Malicious content checks

#### PII Redaction Service
**File:** `src/services/redaction.ts`

**Capabilities:**
- Email detection and redaction
- Phone number redaction (multiple formats)
- SSN redaction (xxx-xx-xxxx, xxxxxxxxx)
- SHA-256 hashing for audit trails
- Position tracking for redactions
- Verification of complete redaction

**Algorithm:**
```
1. Scan text for PII patterns (regex)
2. For each match:
   a. Generate SHA-256 hash
   b. Record position (start, end)
   c. Replace with [REDACTED_TYPE]
3. Store redaction metadata in database
4. Return redacted text + audit log
```

#### AI Service
**File:** `src/services/aiService.ts`

**Ollama Integration:**
- Model: llama3.2 (free, local)
- Temperature: 0.1 (deterministic)
- Timeout: 60s per request
- Retry logic with exponential backoff

**AI Tasks:**

1. **Document Classification**
   - Input: Redacted document text
   - Output: {type, confidence, reasoning}
   - Abstention: If confidence < 0.8
   - Types: company_profile, past_performance, pricing_sheet, unknown

2. **Field Extraction**
   - Dynamic prompting based on document type
   - Structured JSON output
   - Confidence scoring per field
   - Null handling for missing data

3. **Brief & Email Generation**
   - Context-aware prompts
   - Professional tone
   - Compliance-focused content
   - Actionable recommendations

#### Vector Store Service
**File:** `src/services/vectorStore.ts`

**ChromaDB Setup:**
- Local deployment (no cloud dependency)
- Collection: gsa_rules
- Embeddings: all-MiniLM-L6-v2
- Documents: 5 GSA rules (R1-R5)

**RAG Implementation:**
```
Query Process:
1. User query → Embedding
2. Semantic search in ChromaDB
3. Retrieve top-k rules (k=3-5)
4. Include in LLM context
5. Generate response with citations
```

**Rule Structure:**
```typescript
{
  id: 'R1',
  title: 'Rule Title',
  content: 'Detailed rule text...',
  category: 'identification',
  severity: 'critical'
}
```

### 4. Data Layer

#### SQLite Database
**File:** `data/getgsa.db`

**Schema:**

```sql
-- Core documents
documents (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  filename TEXT,
  file_type TEXT,
  file_size INTEGER,
  original_hash TEXT,
  redacted_content TEXT,
  metadata TEXT,
  created_at DATETIME,
  updated_at DATETIME
)

-- Extracted fields
parsed_fields (
  id INTEGER PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  field_name TEXT,
  field_value TEXT,
  confidence REAL,
  created_at DATETIME
)

-- PII audit trail
redactions (
  id INTEGER PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  redaction_type TEXT,  -- email, phone, ssn
  original_value_hash TEXT,
  position_start INTEGER,
  position_end INTEGER,
  created_at DATETIME
)

-- Analysis results
analysis_results (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  document_classification TEXT,
  classification_confidence REAL,
  checklist_items TEXT,  -- JSON
  negotiation_brief TEXT,
  client_email TEXT,
  rule_citations TEXT,  -- JSON array
  status TEXT,
  error_message TEXT,
  created_at DATETIME,
  updated_at DATETIME
)
```

**Indexes:**
- `documents.request_id`
- `parsed_fields.document_id`
- `redactions.document_id`
- `analysis_results.request_id`

#### ChromaDB Vector Store
**Path:** `data/chroma/`

**Contents:**
- 5 GSA rule embeddings
- Metadata (category, severity, title)
- Optimized for semantic search

## Data Flow

### Ingestion Flow

```
1. User uploads document
   ↓
2. Multer middleware processes file
   ↓
3. Document parser extracts text
   ↓
4. PII redaction service processes text
   ↓
5. Document + metadata stored in SQLite
   ↓
6. Redaction audit log created
   ↓
7. Summary returned to user
```

### Analysis Flow

```
1. User submits request_id
   ↓
2. Retrieve redacted document from DB
   ↓
3. AI Service: Classify document
   ↓  (Confidence check)
   ↓
4. AI Service: Extract fields
   ↓
5. Vector Store: Query relevant rules
   ↓  (RAG retrieval)
   ↓
6. Generate compliance checklist
   ↓
7. AI Service: Generate brief & email
   ↓
8. Store results in analysis_results table
   ↓
9. Return complete analysis to user
```

## Scaling Strategy

### Current Architecture
- **Deployment:** Single server
- **Database:** SQLite (suitable for development and small-scale production)
- **AI:** Local Ollama instance
- **Vector Store:** Local ChromaDB

### Horizontal Scaling Path

```
┌─────────────────────────────────────────┐
│         Load Balancer (Nginx)           │
└───────┬─────────────┬───────────────────┘
        │             │
    ┌───▼───┐     ┌───▼───┐
    │ App 1 │     │ App 2 │  (Stateless Express servers)
    └───┬───┘     └───┬───┘
        │             │
    ┌───▼─────────────▼───┐
    │   PostgreSQL        │  (Replace SQLite)
    └─────────────────────┘
    
    ┌─────────────────────┐
    │  Ollama Cluster     │  (Dedicated AI servers)
    └─────────────────────┘
    
    ┌─────────────────────┐
    │  ChromaDB Server    │  (Dedicated vector DB)
    └─────────────────────┘
```

### Performance Optimizations

1. **Async Processing:**
   - Implement job queue (Bull/Redis)
   - Background document processing
   - Webhook callbacks for results

2. **Caching:**
   - Redis cache for frequent queries
   - Rule embeddings cached in memory
   - LLM response caching for similar queries

3. **Database:**
   - Migrate to PostgreSQL for production
   - Connection pooling
   - Read replicas for analytics

4. **AI Service:**
   - Multiple Ollama instances
   - Load balancing across AI servers
   - GPU acceleration

## Security Architecture

### Defense in Depth

```
Layer 1: Network
- Rate limiting (100 req/hr per IP)
- DDoS protection
- Firewall rules

Layer 2: Application
- Helmet security headers
- CORS configuration
- Input validation (Joi)
- SQL injection prevention

Layer 3: Data
- PII redaction before processing
- Encrypted at rest (if needed)
- Hash-based audit trails
- Access controls

Layer 4: AI
- Prompt injection prevention
- Output sanitization
- Context window limits
- Timeout protection
```

## Monitoring & Observability

### Logging
**Winston logger** with multiple transports:
- Console (development)
- File rotation (production)
- Structured JSON logs
- Log levels: error, warn, info, debug

### Metrics to Track
- Request rate and latency
- Document processing time
- AI service response time
- RAG retrieval accuracy
- Error rates by endpoint
- Database query performance

### Health Checks
- Database connectivity
- AI service availability
- Vector store status
- Disk space monitoring
- Memory usage

## Deployment Options

### 1. Development (Local)
```bash
npm run dev
ollama serve
```

### 2. Docker (Single Container)
```bash
docker-compose up
```

### 3. Production (VM/Cloud)
```bash
# Build
npm run build

# Start with PM2
pm2 start dist/server.js --name getgsa

# Setup Ollama service
systemctl start ollama

# Configure reverse proxy (Nginx)
```

### 4. Kubernetes (Future)
```yaml
Deployments:
- getgsa-api (3 replicas)
- ollama (2 replicas with GPU)
- chromadb (1 replica)

Services:
- PostgreSQL (managed)
- Redis (managed)
```

## Future Extensibility

### Plugin Architecture
```typescript
interface DocumentTypePlugin {
  type: string;
  validator: (doc: Document) => boolean;
  extractor: (text: string) => Fields;
  rules: Rule[];
}

// Register new document types
registerPlugin(new CustomDocTypePlugin());
```

### Multi-Tenant Support
```sql
ALTER TABLE documents ADD COLUMN tenant_id TEXT;
CREATE INDEX idx_documents_tenant ON documents(tenant_id);

-- Row-level security
-- Isolated data per customer
```

### Advanced AI Features
- Fine-tuned models for specific document types
- Multi-model ensemble (GPT + Claude + Ollama)
- Active learning from user corrections
- Custom rule creation interface

## Technology Choices Rationale

| Component | Technology | Why? |
|-----------|-----------|------|
| Backend | Node.js + TypeScript | Type safety, async I/O, large ecosystem |
| API | Express.js | Battle-tested, middleware ecosystem, simple |
| Database | SQLite → PostgreSQL | Easy dev setup, production-ready migration path |
| Vector DB | ChromaDB | Free, local deployment, simple API |
| AI | Ollama + llama3.2 | 100% free, local, privacy-focused |
| Frontend | Vanilla JS | No build complexity, fast iteration |
| Styling | TailwindCSS CDN | Rapid prototyping, modern UI |

## Conclusion

This architecture balances:
- **Simplicity:** Easy to understand and deploy
- **Scalability:** Clear path to horizontal scaling
- **Cost:** 100% free to run
- **Security:** Multiple layers of protection
- **Maintainability:** Clean separation of concerns
- **Extensibility:** Plugin-ready for future features
