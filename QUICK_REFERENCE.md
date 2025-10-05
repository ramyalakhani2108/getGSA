# GetGSA Quick Reference

## 🚀 5-Second Start
```bash
./setup.sh && npm run dev
```
Open http://localhost:3000

## 📡 API Endpoints

### POST /api/ingest
Upload and redact documents
```bash
curl -X POST -F "document=@file.pdf" http://localhost:3000/api/ingest
```

### POST /api/analyze
Analyze ingested document
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"request_id":"uuid"}' http://localhost:3000/api/analyze
```

### GET /api/healthz
System health check
```bash
curl http://localhost:3000/api/healthz
```

## 🧪 Testing
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

## 🐳 Docker
```bash
docker-compose up -d     # Start
docker-compose logs -f   # View logs
docker-compose down      # Stop
```

## 🔍 GSA Rules (R1-R5)

| Rule | Requirement | Severity |
|------|-------------|----------|
| R1 | Valid UEI (12-char) | Critical |
| R2 | NAICS → SIN mapping | High |
| R3 | Contract ≥ $25,000 | High |
| R4 | Labor category details | Medium |
| R5 | PII redaction | Critical |

## 📁 Key Files

```
src/
├── server.ts              # Express app
├── routes/
│   ├── ingest.ts         # Upload endpoint
│   └── analyze.ts        # Analysis endpoint
├── services/
│   ├── aiService.ts      # LLM integration
│   ├── redaction.ts      # PII redaction
│   └── vectorStore.ts    # RAG/ChromaDB
└── db/
    └── database.ts       # SQLite schema

public/
├── index.html            # Frontend UI
└── app.js                # Frontend logic

docs/
├── ARCHITECTURE.md       # System design
├── PROMPTS.md           # LLM prompts
└── SECURITY.md          # Security guide
```

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build TypeScript
npm start               # Production server

# Database
npm run migrate         # Create schema
npm run seed            # Seed data

# Code Quality
npm run lint            # Run ESLint
npm run test            # Run tests
```

## 🔧 Environment Variables

```bash
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/getgsa.db
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
CHROMA_PATH=./data/chroma
CONFIDENCE_THRESHOLD=0.8
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE_MB=10
```

## 🐛 Troubleshooting

### Ollama not running?
```bash
ollama serve
ollama pull llama3.2
```

### Port in use?
```bash
lsof -ti:3000 | xargs kill -9
# Or change PORT in .env
```

### Database issues?
```bash
rm -rf data/getgsa.db
npm run migrate
```

### Dependencies broken?
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📊 Tech Stack

**Backend**: Node.js 18+, TypeScript, Express.js  
**Database**: SQLite → PostgreSQL  
**Vector DB**: ChromaDB  
**AI**: Ollama (llama3.2)  
**Frontend**: Vanilla JS, TailwindCSS  
**Testing**: Jest, Supertest  

## 🔐 Security Checklist

- [x] PII redaction before AI
- [x] Rate limiting (100 req/hr)
- [x] Security headers (Helmet)
- [x] Input validation (Joi)
- [x] SQL injection prevention
- [x] CORS configuration
- [x] Error handling
- [x] Audit logging

## 📈 Performance Tips

1. Use smaller LLM models for speed
2. Cache frequent RAG queries
3. Add database indexes
4. Implement job queue for async
5. Scale horizontally with load balancer

## 🎯 Sample Documents

Three sample documents built into UI:
- Company Profile (UEI, DUNS, NAICS)
- Past Performance (contracts)
- Pricing Sheet (labor categories)

## 📚 Documentation

- **README.md** - Getting started
- **ARCHITECTURE.md** - System design
- **PROMPTS.md** - LLM prompts
- **SECURITY.md** - Security guide
- **PROJECT_GUIDE.md** - Developer guide
- **SUMMARY.md** - Project overview

## 🎓 Key Concepts

**RAG**: Retrieval-Augmented Generation - semantic search over GSA rules  
**PII**: Personally Identifiable Information - emails, phones, SSNs  
**UEI**: Unique Entity Identifier - 12-char GSA requirement  
**NAICS**: Industry classification codes (6-digit)  
**Abstention**: AI returns "unknown" when confidence < 0.8  

## 🚦 Status Indicators

**Compliant**: ✓ Green - Meets requirements  
**Non-Compliant**: ✗ Red - Fails requirements  
**Needs Review**: ⚠ Yellow - Manual check needed  

## 💾 Data Retention

- Documents: 90 days
- Analysis results: 90 days
- Logs: 30 days
- Original PII: **Never stored**

## 🔗 Useful Links

- Ollama: https://ollama.ai/
- ChromaDB: https://docs.trychroma.com/
- TypeScript: https://www.typescriptlang.org/
- Express: https://expressjs.com/
- Jest: https://jestjs.io/

## 📞 Support

Check documentation first:
1. README.md for setup
2. PROJECT_GUIDE.md for development
3. Logs in `logs/combined.log`
4. Health check at `/api/healthz`

---

**Quick Deploy**: `./setup.sh && npm run dev`  
**Quick Test**: Upload sample → Ingest → Analyze  
**100% Free**: No paid services required  

