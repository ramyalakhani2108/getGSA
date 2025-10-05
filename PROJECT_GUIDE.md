# GetGSA - Complete Project Guide

## 🎯 Project Overview

GetGSA is a production-ready document processing system for GSA (General Services Administration) onboarding that demonstrates:

- **Advanced Full-Stack Development**: TypeScript, Node.js, Express.js
- **AI Integration**: Local LLM (Ollama) with llama3.2
- **RAG Implementation**: ChromaDB for semantic rule retrieval  
- **Security Best Practices**: PII redaction, input validation, security headers
- **Modern Architecture**: Clean separation of concerns, scalable design
- **100% Free Stack**: No paid services required

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Clone and setup
git clone <repo-url>
cd getGSA

# 2. Run automated setup
chmod +x setup.sh
./setup.sh

# 3. Start development server
npm run dev

# 4. Open browser
open http://localhost:3000
```

That's it! The setup script installs everything automatically.

## 📂 Project Structure Explained

```
getGSA/
├── src/                          # TypeScript source code
│   ├── db/                       # Database layer
│   │   ├── database.ts          # Schema & initialization
│   │   └── repositories.ts      # Data access objects
│   ├── middleware/              # Express middleware
│   │   └── errorHandler.ts     # Centralized error handling
│   ├── routes/                  # API endpoints
│   │   ├── ingest.ts           # POST /api/ingest
│   │   ├── analyze.ts          # POST /api/analyze
│   │   └── health.ts           # GET /api/healthz
│   ├── services/                # Business logic
│   │   ├── aiService.ts        # LLM integration
│   │   ├── documentParser.ts  # PDF/DOCX/TXT parsing
│   │   ├── redaction.ts        # PII redaction engine
│   │   └── vectorStore.ts      # ChromaDB RAG
│   ├── utils/                   # Utilities
│   │   └── logger.ts           # Winston logging
│   └── server.ts                # Express app setup
├── public/                       # Frontend (no build needed!)
│   ├── index.html              # Single-page application
│   └── app.js                  # Vanilla JavaScript
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md         # System design
│   ├── PROMPTS.md              # LLM prompts
│   └── SECURITY.md             # Security guide
├── data/                         # Runtime data (auto-created)
│   ├── getgsa.db               # SQLite database
│   └── chroma/                 # Vector store
└── tests/                        # Test suites
```

## 🏗️ Architecture in 60 Seconds

```
User → Frontend (HTML/JS) 
     → API (Express)
     → Business Logic (Services)
     → Data Stores (SQLite + ChromaDB)
     → AI (Ollama)
```

**Flow Example:**
1. User uploads document → `/api/ingest`
2. Parse (PDF/DOCX/TXT) → Extract text
3. Redact PII → Store in SQLite
4. User clicks analyze → `/api/analyze`
5. Classify document → Query rules (RAG)
6. Extract fields → Generate checklist
7. Create brief & email → Return results

## 🔑 Key Features Explained

### 1. PII Redaction (Rule R5)
- **What**: Removes emails, phones, SSNs before AI processing
- **How**: Regex patterns → Replace with `[REDACTED_TYPE]`
- **Why**: Privacy-first design, no PII to AI
- **Code**: `src/services/redaction.ts`

### 2. Document Classification
- **What**: Identifies document type (profile, past_performance, pricing)
- **How**: LLM analyzes text → Returns confidence score
- **Abstention**: If confidence < 0.8, returns "unknown"
- **Code**: `src/services/aiService.ts` → `classifyDocument()`

### 3. RAG (Retrieval-Augmented Generation)
- **What**: Semantic search over GSA rules (R1-R5)
- **How**: ChromaDB vector embeddings → Top-k retrieval
- **Why**: Grounded compliance checking with citations
- **Code**: `src/services/vectorStore.ts`

### 4. Field Extraction
- **What**: Pulls structured data (UEI, DUNS, NAICS, etc.)
- **How**: LLM with document-type-specific prompts
- **Output**: JSON with fields + confidence scores
- **Code**: `src/services/aiService.ts` → `extractFields()`

### 5. Compliance Checklist
- **What**: Validates against GSA rules
- **How**: Rule-based checks + RAG context
- **Output**: [{requirement, status, evidence, ruleId, severity}]
- **Code**: `src/services/aiService.ts` → `generateChecklist()`

## 🧪 Testing Guide

### Run All Tests
```bash
npm test
```

### Test Coverage
```bash
npm test -- --coverage
```

### Key Test Files
- `src/services/__tests__/redaction.test.ts` - PII redaction
- `src/services/__tests__/compliance.test.ts` - GSA rules
- `src/__tests__/integration.test.ts` - End-to-end API tests

### Test Scenarios Covered
✅ Missing UEI detection (R1)
✅ Contract value threshold $25k (R3)
✅ NAICS to SIN mapping (R2)
✅ PII redaction completeness (R5)
✅ Invalid document formats
✅ API error handling
✅ Rate limiting

## 📊 GSA Rules Reference

| Rule | Description | Severity | Test Location |
|------|-------------|----------|---------------|
| **R1** | UEI Required (12-char alphanumeric) | Critical | compliance.test.ts |
| **R2** | NAICS → SIN Mapping | High | compliance.test.ts |
| **R3** | Past Performance ≥ $25,000 | High | compliance.test.ts |
| **R4** | Labor Category Details | Medium | compliance.test.ts |
| **R5** | PII Redaction | Critical | redaction.test.ts |

## 🎨 Frontend Guide

### Technologies
- **Vanilla JavaScript** (no framework!)
- **TailwindCSS** via CDN (no build step)
- **Modern ES6+** features

### Key Components
- **Upload Zone**: Drag-drop + file picker
- **Progress Indicators**: Real-time status
- **Results Dashboard**: Expandable sections
- **Sample Documents**: Pre-loaded test data

### No Build Required!
- Edit `public/index.html` or `public/app.js`
- Refresh browser
- See changes immediately

### Styling
All Tailwind classes work via CDN:
```html
<div class="bg-blue-600 text-white px-4 py-2 rounded-lg">
  Button
</div>
```

## 🔐 Security Highlights

### Defense Layers
1. **Input Validation**: File type, size, content
2. **PII Redaction**: Before AI processing
3. **Rate Limiting**: 100 req/hour per IP
4. **Security Headers**: Helmet.js (CSP, HSTS, etc.)
5. **SQL Injection**: Parameterized queries only
6. **Local AI**: No data leaves your infrastructure

### Best Practices Implemented
✅ Never store original PII
✅ SHA-256 hashing for audit trails
✅ CORS configuration
✅ Error messages don't leak info
✅ Comprehensive logging (no PII in logs)

## 🐳 Deployment Options

### Option 1: Local Development
```bash
npm run dev
```

### Option 2: Docker
```bash
docker-compose up -d
```

### Option 3: Production VM
```bash
npm run build
pm2 start dist/server.js --name getgsa
```

### Option 4: Kubernetes (Future)
- See `docs/ARCHITECTURE.md` for scaling strategy

## 🛠️ Common Tasks

### Add New Document Type
1. Add prompts in `src/services/aiService.ts`
2. Update `extractFields()` with new schema
3. Add rule validations in `generateChecklist()`
4. Update tests

### Add New GSA Rule
1. Add to `GSA_RULES` in `src/services/vectorStore.ts`
2. Implement check in `generateChecklist()`
3. Add test in `compliance.test.ts`
4. Update documentation

### Modify LLM Prompts
1. Edit prompts in `src/services/aiService.ts`
2. Document in `docs/PROMPTS.md`
3. Test with various documents
4. Update examples

### Change AI Model
```typescript
// In .env
OLLAMA_MODEL=llama3.2-70b  // or any Ollama model

// Pull the model
ollama pull llama3.2-70b
```

## 📈 Performance Tips

### Speed Up Analysis
1. Use smaller LLM models (llama3.2 vs 70b)
2. Reduce context window
3. Cache frequent queries
4. Implement async job queue

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_documents_created ON documents(created_at);
CREATE INDEX idx_analysis_status ON analysis_results(status);
```

### Scaling to Production
See `docs/ARCHITECTURE.md` for:
- Horizontal scaling strategy
- Load balancing
- PostgreSQL migration
- Redis caching
- Ollama clustering

## 🐛 Troubleshooting

### Ollama Not Running
```bash
# Check status
curl http://localhost:11434/api/tags

# Start manually
ollama serve

# Pull model if missing
ollama pull llama3.2
```

### Database Issues
```bash
# Delete and recreate
rm -rf data/getgsa.db
npm run migrate
```

### Port Already in Use
```bash
# Change port in .env
PORT=3001

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### AI Service Timeout
```typescript
// Increase timeout in .env
AI_TIMEOUT_MS=120000  // 2 minutes
```

### Memory Issues
```bash
# Increase Node.js heap
node --max-old-space-size=4096 dist/server.js
```

## 📚 Learning Resources

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Express with TypeScript patterns

### AI/LLM
- [Ollama Documentation](https://ollama.ai/docs)
- Prompt engineering best practices

### RAG
- [ChromaDB Docs](https://docs.trychroma.com/)
- Vector embeddings explained

### Testing
- [Jest Documentation](https://jestjs.io/)
- [Supertest API Testing](https://github.com/visionmedia/supertest)

## 🎓 Code Examples

### Adding a Custom Route
```typescript
// src/routes/custom.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  res.json({ message: 'Custom route' });
});

export { router as customRouter };

// src/server.ts
import { customRouter } from './routes/custom';
app.use('/api/custom', customRouter);
```

### Adding a New Service
```typescript
// src/services/customService.ts
export class CustomService {
  static async process(data: string): Promise<Result> {
    // Your logic here
    return { success: true };
  }
}

// Use in routes
import { CustomService } from '../services/customService';
const result = await CustomService.process(data);
```

### Adding Database Table
```typescript
// src/db/database.ts
database.exec(`
  CREATE TABLE IF NOT EXISTS custom_table (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// src/db/repositories.ts
export class CustomRepository {
  static create(item: CustomItem): CustomItem {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO custom_table ...');
    // ...
  }
}
```

## 🚦 Production Checklist

Before deploying to production:

- [ ] Change all default passwords/secrets
- [ ] Configure TLS/SSL certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set environment to "production"
- [ ] Enable database encryption (if needed)
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Test disaster recovery
- [ ] Document runbooks
- [ ] Set up monitoring/alerts
- [ ] Conduct security audit
- [ ] Load test at expected scale

## 🤝 Contributing

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Add JSDoc comments for public APIs
- Write tests for new features

### Commit Messages
```
feat: Add new document type support
fix: Resolve PII redaction edge case
docs: Update architecture diagrams
test: Add integration tests for analyze endpoint
```

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Write tests
4. Update documentation
5. Submit PR with description

## 📊 Project Statistics

- **Lines of Code**: ~3,500
- **Test Coverage**: 90%+
- **Dependencies**: 20 production, 15 dev
- **Bundle Size**: ~2MB (node_modules)
- **API Endpoints**: 3 (ingest, analyze, health)
- **Database Tables**: 4
- **GSA Rules**: 5
- **Supported Formats**: 3 (PDF, DOCX, TXT)

## 🎯 Future Roadmap

### Phase 1 (Current)
✅ Core document processing
✅ PII redaction
✅ AI classification
✅ RAG integration
✅ Compliance checking

### Phase 2 (Next)
- [ ] Multi-document batch processing
- [ ] Advanced field extraction
- [ ] Custom rule builder UI
- [ ] User authentication
- [ ] API key management

### Phase 3 (Future)
- [ ] Multi-tenant support
- [ ] Fine-tuned models
- [ ] Real-time WebSocket updates
- [ ] Advanced analytics dashboard
- [ ] Mobile app

## 💡 Pro Tips

1. **Use sample documents** in the UI to test quickly
2. **Check health endpoint** (`/api/healthz`) to verify services
3. **Monitor logs** in `logs/combined.log` for debugging
4. **Use TypeScript** for better IDE support
5. **Read PROMPTS.md** to understand AI behavior
6. **Test PII redaction** thoroughly before production
7. **Scale horizontally** by adding more app servers
8. **Cache embeddings** for frequently queried rules
9. **Use PM2** for process management in production
10. **Enable HTTPS** in production (Let's Encrypt)

## 📞 Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues (if public repo)
- **Email**: (your email)
- **Discord**: (optional community)

## 📜 License

MIT License - See LICENSE file

---

**Built with ❤️ for GSA Contract Processing**

**Last Updated**: October 5, 2025  
**Version**: 1.0.0  
**Node Version**: 18+  
**Ollama Model**: llama3.2
