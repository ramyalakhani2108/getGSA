# Security Documentation

## Overview

GetGSA implements multiple layers of security to protect sensitive government contracting information. This document outlines our security architecture, PII handling, and compliance measures.

## Security Principles

1. **Defense in Depth**: Multiple overlapping security layers
2. **Privacy by Design**: PII redaction before AI processing
3. **Least Privilege**: Minimal permissions and access
4. **Zero Trust**: Verify all inputs and outputs
5. **Audit Trail**: Comprehensive logging of sensitive operations

## PII Redaction

### Methodology

**Pre-Processing Redaction**
- All documents undergo PII redaction **before** any AI processing
- Redacted content is stored; original content is never persisted
- Hash-based audit trail maintains verification capability

### Redaction Patterns

| PII Type | Pattern | Replacement | Example |
|----------|---------|-------------|---------|
| Email | RFC 5322 compliant regex | `[REDACTED_EMAIL]` | user@example.com → [REDACTED_EMAIL] |
| Phone | Multiple formats (US) | `[REDACTED_PHONE]` | (555) 123-4567 → [REDACTED_PHONE] |
| SSN | xxx-xx-xxxx, xxxxxxxxx | `[REDACTED_SSN]` | 123-45-6789 → [REDACTED_SSN] |

### Audit Trail

```typescript
// Each redaction is logged with:
interface RedactionAudit {
  document_id: string;
  redaction_type: 'email' | 'phone' | 'ssn';
  original_value_hash: string;  // SHA-256 hash
  position_start: number;
  position_end: number;
  timestamp: Date;
}
```

**Hash Verification**: SHA-256 hashing allows verification without storing original values.

### Business Contact Retention

**Retained:**
- Company email addresses (e.g., contact@company.com)
- Office phone numbers in business context
- Public business addresses

**Redacted:**
- Personal email addresses
- Personal phone numbers
- Social Security Numbers
- Home addresses

## Data Retention

### Storage Policies

| Data Type | Retention | Location | Encryption |
|-----------|-----------|----------|------------|
| Redacted Documents | 90 days | SQLite | At rest |
| Analysis Results | 90 days | SQLite | At rest |
| PII Hashes | 90 days | SQLite | At rest |
| Application Logs | 30 days | File system | Optional |
| Original Documents | **Never stored** | N/A | N/A |

### Data Deletion

```bash
# Automated cleanup (recommended cron job)
# Delete documents older than 90 days
DELETE FROM documents WHERE created_at < date('now', '-90 days');

# Clean orphaned records
DELETE FROM parsed_fields WHERE document_id NOT IN (SELECT id FROM documents);
DELETE FROM redactions WHERE document_id NOT IN (SELECT id FROM documents);
DELETE FROM analysis_results WHERE request_id NOT IN (SELECT DISTINCT request_id FROM documents);
```

## Application Security

### Input Validation

**File Upload Validation**
```typescript
// Size limits
MAX_FILE_SIZE = 10MB

// Allowed MIME types
ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
]

// File name sanitization
- Remove path separators (/, \)
- Remove null bytes
- Remove parent directory references (..)
- Limit length to 255 characters
```

**API Input Validation**
```typescript
// Using Joi schema validation
const ingestSchema = Joi.object({
  metadata: Joi.string().optional().max(1000)
});

const analyzeSchema = Joi.object({
  request_id: Joi.string().uuid().required()
});
```

### Output Sanitization

**HTML/XSS Prevention**
- No HTML rendering of user-provided content
- JSON-only API responses
- Content-Type headers enforced

**SQL Injection Prevention**
- Parameterized queries only
- No dynamic SQL construction
- ORM-style repositories

**Path Traversal Prevention**
```typescript
// Filename sanitization
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\/\\]/g, '')      // Remove path separators
    .replace(/\0/g, '')           // Remove null bytes
    .replace(/\.\./g, '')         // Remove parent references
    .trim();
}
```

## Security Headers

### Helmet Configuration

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));
```

### CORS Configuration

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400  // 24 hours
}));
```

## Rate Limiting

### Configuration

```typescript
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 100,                   // 100 requests per hour per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Whitelist health checks
    return req.path === '/api/healthz';
  }
});
```

### Bypass for Trusted IPs (Production)

```typescript
// Optional: Whitelist internal IPs
const trustedIPs = ['10.0.0.0/8', '172.16.0.0/12'];

const limiter = rateLimit({
  skip: (req) => {
    const ip = req.ip;
    return trustedIPs.some(range => ipInRange(ip, range));
  }
});
```

## Authentication & Authorization

### Current State: Open Access
- Development/demo version has no authentication
- Suitable for internal networks or proof-of-concept

### Production Recommendations

#### API Key Authentication
```typescript
// Middleware
function apiKeyAuth(req, res, next) {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey || !validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Attach user/tenant to request
  req.user = getUserFromApiKey(apiKey);
  next();
}

app.use('/api/', apiKeyAuth);
```

#### JWT Authentication
```typescript
// For user-based access
import jwt from 'jsonwebtoken';

function jwtAuth(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

#### OAuth 2.0 Integration
```typescript
// For enterprise SSO
- Implement OAuth 2.0 with GSA or agency IdP
- Support SAML 2.0 for government systems
- Multi-factor authentication (MFA) support
```

## Network Security

### Firewall Rules (Production)

```bash
# Allow only necessary ports
- Port 443 (HTTPS)
- Port 80 (HTTP redirect to HTTPS)
- Port 22 (SSH - restricted IPs only)

# Deny all other inbound traffic
# Allow all outbound for API calls (Ollama, etc.)
```

### TLS/SSL Configuration

```nginx
# Nginx reverse proxy configuration
server {
    listen 443 ssl http2;
    server_name getgsa.example.com;
    
    ssl_certificate /etc/letsencrypt/live/getgsa.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/getgsa.example.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## AI Service Security

### Local Processing
- **No external AI APIs**: All processing done locally via Ollama
- **No data leakage**: Documents never leave your infrastructure
- **Model isolation**: Separate model instances per tenant (if multi-tenant)

### Prompt Injection Prevention

```typescript
// Sanitize user input before LLM
function sanitizeForLLM(input: string): string {
  return input
    .replace(/<script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<\?php/gi, '')
    .substring(0, 10000);  // Limit length
}

// Validate LLM outputs
function validateLLMOutput(output: string): boolean {
  // Check for command injection attempts
  const dangerousPatterns = [
    /rm -rf/,
    /curl.*\|.*sh/,
    /<script>/i,
    /eval\(/
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(output));
}
```

### Context Window Limits

```typescript
// Prevent DoS via large context
const MAX_CONTEXT_LENGTH = 4096;  // tokens

function truncateContext(text: string): string {
  if (text.length > MAX_CONTEXT_LENGTH * 4) {  // ~4 chars per token
    // Take first 3000 chars + last 1000 chars
    return text.substring(0, 3000) + 
           '\n...[content truncated]...\n' + 
           text.substring(text.length - 1000);
  }
  return text;
}
```

## Database Security

### SQL Injection Prevention

```typescript
// ✅ GOOD: Parameterized queries
const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
const result = stmt.get(documentId);

// ❌ BAD: String concatenation
const query = `SELECT * FROM documents WHERE id = '${documentId}'`;  // NEVER DO THIS
```

### Database Encryption

```typescript
// For sensitive deployments
- Enable SQLite encryption extension (SQLCipher)
- Encrypt database file at rest
- Secure key management (environment variable, KMS)

// Example with SQLCipher
const db = new Database('getgsa.db', {
  key: process.env.DB_ENCRYPTION_KEY
});
```

### Access Control

```sql
-- Create read-only user for analytics
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Revoke dangerous permissions
REVOKE DELETE ON documents FROM app_user;
```

## Logging & Monitoring

### Secure Logging

```typescript
// Log structure
{
  timestamp: '2024-10-05T10:30:00Z',
  level: 'info',
  message: 'Document ingested',
  requestId: 'uuid',
  documentId: 'uuid',
  // NEVER LOG:
  // - PII
  // - API keys
  // - Passwords
  // - Full document content
}
```

### What to Log

✅ **Log:**
- Authentication attempts
- Authorization failures
- API endpoint access
- Error conditions
- Performance metrics
- Security events (rate limit hits, invalid inputs)

❌ **Never Log:**
- Passwords or API keys
- PII (emails, phones, SSNs)
- Full document content
- Sensitive business data

### Log Rotation

```typescript
// Winston configuration
new winston.transports.File({
  filename: 'error.log',
  level: 'error',
  maxsize: 5242880,  // 5MB
  maxFiles: 5,
  tailable: true
})
```

## Incident Response

### Detection

**Monitoring for:**
- Unusual API usage patterns
- Multiple failed authentication attempts
- Large file uploads
- Suspicious error rates
- Slow response times (potential DoS)

### Response Procedures

1. **Identify**: Detect and classify the incident
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat or vulnerability
4. **Recover**: Restore services
5. **Lessons Learned**: Document and improve

### Emergency Contacts

```yaml
Security Team:
  Primary: security@example.com
  Phone: +1-555-SECURITY
  
On-Call Rotation:
  - Week 1: Alice (alice@example.com)
  - Week 2: Bob (bob@example.com)
  
Escalation:
  Level 1: Development Team (15 min response)
  Level 2: Security Team (30 min response)
  Level 3: Management (1 hour response)
```

## Compliance

### FISMA Compliance Considerations

For government deployments:
- Implement FedRAMP controls
- Conduct regular security audits
- Maintain continuous monitoring
- Document security procedures
- Implement incident response plan

### Data Classification

| Classification | Example | Handling |
|---------------|---------|----------|
| Public | Marketing materials | No special handling |
| Internal | Business processes | Standard security |
| Confidential | Contract details | Encryption, access control |
| Restricted | PII, SSNs | Redaction, encrypted storage |

## Security Checklist

### Pre-Deployment

- [ ] Change all default passwords
- [ ] Configure TLS/SSL certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set strong JWT secrets
- [ ] Enable database encryption (if needed)
- [ ] Configure secure headers (Helmet)
- [ ] Set up log rotation
- [ ] Test PII redaction thoroughly

### Regular Maintenance

- [ ] Review access logs weekly
- [ ] Update dependencies monthly (npm audit)
- [ ] Rotate API keys quarterly
- [ ] Security audit annually
- [ ] Penetration testing annually
- [ ] Review and update firewall rules
- [ ] Test backup/restore procedures

### Monitoring Alerts

- [ ] Failed authentication attempts > 10/hour
- [ ] Rate limit violations > 100/hour
- [ ] Error rate > 5%
- [ ] Response time > 5 seconds
- [ ] Disk usage > 80%
- [ ] Memory usage > 90%

## Vulnerability Management

### Dependency Scanning

```bash
# Run regularly (CI/CD or weekly)
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

### Security Updates

```bash
# Update Node.js
nvm install --lts
nvm use --lts

# Update dependencies
npm update

# Major version upgrades (review breaking changes)
npm install package@latest
```

## Secure Development

### Code Review Checklist

- [ ] No hardcoded secrets
- [ ] Parameterized database queries
- [ ] Input validation present
- [ ] Output sanitization implemented
- [ ] Error messages don't leak sensitive info
- [ ] PII properly redacted
- [ ] Authentication/authorization checks
- [ ] Logging doesn't contain PII

### Git Security

```bash
# Never commit:
- .env files
- API keys
- Passwords
- Database files
- Sensitive logs

# Use .gitignore
.env
.env.local
*.db
logs/
data/
```

## Contact

For security concerns or to report vulnerabilities:

**Email**: security@example.com (PGP key available)
**Bug Bounty**: Not currently active
**Response Time**: 24 hours for critical issues

---

**Document Version**: 1.0  
**Last Updated**: October 5, 2025  
**Next Review**: January 5, 2026
