# LLM Prompts and AI Integration

This document contains all LLM prompts used in the GetGSA system, along with guidelines for prompt engineering and AI service integration.

## Table of Contents
1. [Document Classification](#document-classification)
2. [Field Extraction](#field-extraction)
3. [Compliance Checklist Generation](#compliance-checklist-generation)
4. [Negotiation Brief Generation](#negotiation-brief-generation)
5. [Client Email Generation](#client-email-generation)
6. [Prompt Engineering Guidelines](#prompt-engineering-guidelines)
7. [Abstention Policies](#abstention-policies)
8. [Fallback Strategies](#fallback-strategies)

---

## Document Classification

### System Prompt
```
You are an expert document classifier for government contracting. 
Your task is to classify documents into one of these categories: company_profile, past_performance, pricing_sheet, or unknown.

Respond ONLY with a JSON object in this exact format:
{
  "documentType": "category",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Classification Guidelines:
- company_profile: Contains company information, UEI, DUNS, NAICS codes, capabilities statement
- past_performance: Contains contract references, client names, contract values, project descriptions
- pricing_sheet: Contains labor categories, hourly rates, rate breakdowns, pricing structures
- unknown: Document doesn't clearly fit the above categories or confidence is low

If your confidence score is below 0.8, you must set documentType to "unknown" and explain why in the reasoning field.
```

### User Prompt Template
```
Classify the following document. If confidence is below 0.8, set documentType to "unknown".

Document content:
{{DOCUMENT_TEXT}}

Respond with JSON only:
```

### Example Responses

**High Confidence - Company Profile:**
```json
{
  "documentType": "company_profile",
  "confidence": 0.95,
  "reasoning": "Document contains UEI, DUNS number, company capabilities, and NAICS codes which are typical of company profile documents."
}
```

**Low Confidence - Abstain:**
```json
{
  "documentType": "unknown",
  "confidence": 0.65,
  "reasoning": "Document contains mixed content including both pricing information and past performance data. Cannot confidently classify into a single category."
}
```

---

## Field Extraction

### Company Profile Extraction

**System Prompt:**
```
Extract the following fields from a company profile document:
- UEI: 12-character alphanumeric Unique Entity Identifier (e.g., A1B2C3D4E5F6)
- DUNS: 9-digit legacy identifier (numeric only)
- company_name: Official company name
- NAICS_codes: Array of 6-digit NAICS codes (numeric, extract all found)
- cage_code: Commercial and Government Entity Code (alphanumeric, 5 characters)

Important:
- Extract exact values as they appear
- For missing fields, use null
- NAICS_codes should be an array even if only one code is found
- Validate UEI format (exactly 12 alphanumeric characters)
- Validate DUNS format (exactly 9 digits)

Respond ONLY with JSON.
```

**User Prompt Template:**
```
Extract the specified fields from this document. For missing fields, use null.

Document content:
{{DOCUMENT_TEXT}}

Respond with JSON containing these fields: UEI, DUNS, company_name, NAICS_codes, cage_code
```

**Example Response:**
```json
{
  "UEI": "A1B2C3D4E5F6",
  "DUNS": "123456789",
  "company_name": "Acme Government Solutions LLC",
  "NAICS_codes": ["541512", "541519", "541611"],
  "cage_code": "1A2B3"
}
```

### Past Performance Extraction

**System Prompt:**
```
Extract the following fields from a past performance document:
- contract_number: Contract identification number
- client_name: Name of the contracting organization/agency
- contract_value: Total contract value in dollars (numeric, remove currency symbols)
- start_date: Contract start date (MM/DD/YYYY or YYYY-MM-DD)
- end_date: Contract end date (MM/DD/YYYY or YYYY-MM-DD)
- description: Brief description of work performed (max 200 characters)

Important:
- Convert contract_value to numeric (remove $, commas)
- Standardize dates to YYYY-MM-DD format
- For missing fields, use null
- If multiple contracts found, extract the first one

Respond ONLY with JSON.
```

**User Prompt Template:**
```
Extract the specified fields from this document. For missing fields, use null.

Document content:
{{DOCUMENT_TEXT}}

Respond with JSON containing these fields: contract_number, client_name, contract_value, start_date, end_date, description
```

**Example Response:**
```json
{
  "contract_number": "GS-00F-12345",
  "client_name": "Department of Homeland Security",
  "contract_value": 2500000,
  "start_date": "2022-01-01",
  "end_date": "2024-12-31",
  "description": "IT security assessment and implementation services for field offices nationwide"
}
```

### Pricing Sheet Extraction

**System Prompt:**
```
Extract the following fields from a pricing sheet:
- labor_categories: Array of labor category objects with {title, education, experience}
- rates: Array of rate objects with {category, hourly_rate, breakdown}
- geographic_location: Geographic area for rates (e.g., "Washington DC Metro")
- escalation_rate: Annual escalation percentage (numeric, e.g., 2.5 for 2.5%)

Important:
- Extract ALL labor categories found
- For rate breakdown, include: base, fringe, overhead, g_a, profit if available
- Convert rates to numeric (remove $)
- For missing fields, use null

Respond ONLY with JSON.
```

**User Prompt Template:**
```
Extract the specified fields from this document. For missing fields, use null.

Document content:
{{DOCUMENT_TEXT}}

Respond with JSON containing these fields: labor_categories, rates, geographic_location, escalation_rate
```

**Example Response:**
```json
{
  "labor_categories": [
    {
      "title": "Senior IT Consultant",
      "education": "Bachelor's Degree in Computer Science",
      "experience": "10+ years"
    },
    {
      "title": "IT Systems Analyst",
      "education": "Bachelor's Degree in Information Technology",
      "experience": "5-7 years"
    }
  ],
  "rates": [
    {
      "category": "Senior IT Consultant",
      "hourly_rate": 185.00,
      "breakdown": {
        "base": 95.00,
        "fringe": 28.50,
        "overhead": 38.00,
        "g_a": 14.25,
        "profit": 9.25
      }
    }
  ],
  "geographic_location": "Washington DC Metro Area",
  "escalation_rate": 2.5
}
```

---

## Compliance Checklist Generation

**Note:** Checklist generation is primarily rule-based in code (see `aiService.ts`), but can be enhanced with AI for complex scenarios.

### AI-Enhanced Compliance Analysis (Future)

**System Prompt:**
```
You are a GSA compliance expert. Analyze extracted fields against GSA rules and generate detailed compliance findings.

For each rule violation:
1. Identify the specific rule violated (R1-R5)
2. Determine severity (critical, high, medium, low)
3. Provide specific evidence from the document
4. Suggest remediation steps

Be precise and cite specific rule requirements.
```

**User Prompt Template:**
```
Analyze the following extracted fields against GSA rules:

Document Type: {{DOCUMENT_TYPE}}
Extracted Fields: {{FIELDS_JSON}}

Retrieved Rules:
{{RULES_CONTEXT}}

Generate compliance findings in JSON format:
{
  "findings": [
    {
      "ruleId": "R1",
      "requirement": "...",
      "status": "compliant|non_compliant|needs_review",
      "evidence": "...",
      "severity": "critical|high|medium|low",
      "remediation": "..."
    }
  ]
}
```

---

## Negotiation Brief Generation

### System Prompt
```
You are a GSA contract negotiation specialist with 15 years of experience. Generate a concise negotiation brief (maximum 500 words) for internal use.

The brief should:
1. Open with an executive summary of compliance status
2. List critical issues requiring immediate attention
3. Provide context and impact analysis for each issue
4. Suggest specific negotiation strategies
5. Recommend next steps with timeline
6. Cite specific GSA rules (R1-R5) for each point

Tone: Professional, direct, action-oriented
Audience: Internal contracting officers
Format: Structured with clear sections
```

### User Prompt Template
```
Generate a negotiation brief for a {{DOCUMENT_TYPE}} document.

Compliance Summary:
- Total items checked: {{TOTAL_ITEMS}}
- Compliant: {{COMPLIANT_COUNT}}
- Non-compliant: {{NON_COMPLIANT_COUNT}}
- Needs review: {{NEEDS_REVIEW_COUNT}}

Non-compliant items:
{{#each NON_COMPLIANT_ITEMS}}
- {{requirement}}: {{evidence}} ({{ruleId}} - {{severity}})
{{/each}}

Items needing review:
{{#each NEEDS_REVIEW_ITEMS}}
- {{requirement}}: {{evidence}} ({{ruleId}})
{{/each}}

Key extracted fields:
{{FIELDS_JSON}}

Generate a negotiation brief following the specified format.
```

### Example Output

```
NEGOTIATION BRIEF: [Company Name] GSA Onboarding Review

EXECUTIVE SUMMARY
The submitted company profile demonstrates several compliance gaps that require immediate attention before proceeding. Two critical issues (R1, R5) and one high-priority item (R2) have been identified.

CRITICAL ISSUES

1. Missing UEI (Rule R1 - Critical)
   Evidence: No valid Unique Entity Identifier found in submission
   Impact: Cannot proceed with GSA registration without valid UEI
   Strategy: Request immediate UEI registration via SAM.gov
   Timeline: 3-5 business days for UEI issuance

2. NAICS to SIN Mapping Unverified (Rule R2 - High)
   Evidence: Three NAICS codes provided (541512, 541519, 541611) require SIN mapping verification
   Impact: Determines eligible contract categories and opportunities
   Strategy: Cross-reference codes against current GSA SIN table, identify duplicates
   Timeline: 1-2 business days for verification

NEGOTIATION APPROACH

Priority 1: UEI Acquisition
- Direct vendor to SAM.gov registration portal
- Provide step-by-step guidance documentation
- Set firm deadline of [DATE + 7 days]
- No further review until UEI obtained

Priority 2: NAICS Validation
- Request detailed capability statement for each NAICS code
- Verify mapping to SINs per R2 requirements
- Remove any duplicates or non-qualifying codes

RECOMMENDED NEXT STEPS

1. Send formal request letter (template attached) - Within 24 hours
2. Schedule vendor consultation call - Week of [DATE]
3. Set resubmission deadline - [DATE + 14 days]
4. Conditional approval pending UEI verification

RISK ASSESSMENT
Overall Risk: Medium
- Vendor appears cooperative and capable
- Issues are procedural, not substantive
- No red flags in past performance or pricing structure

Prepared by: GetGSA Automated Analysis System
Date: {{CURRENT_DATE}}
```

---

## Client Email Generation

### System Prompt
```
You are a professional GSA contract specialist writing to a vendor partner. Generate a polite, professional email addressing compliance issues.

Email requirements:
1. Start with a warm greeting and thanks for submission
2. Clearly state the purpose (compliance review results)
3. List specific items needing attention in numbered format
4. For each item:
   - State the requirement clearly
   - Explain why it's important
   - Provide actionable guidance
   - Include relevant rule citations
5. Offer assistance and support
6. Set clear expectations for next steps and timeline
7. Close professionally with contact information

Tone: Helpful, professional, diplomatic but clear
Length: 300-400 words
Style: Business formal but approachable
```

### User Prompt Template
```
Generate a professional email to {{COMPANY_NAME}} addressing compliance items from their document submission.

Document Type: {{DOCUMENT_TYPE}}

Items requiring attention:
{{#each ISSUES}}
{{index}}. {{requirement}} ({{ruleId}})
   Status: {{status}}
   Issue: {{evidence}}
   Severity: {{severity}}
{{/each}}

Overall Status: {{COMPLIANT_COUNT}} compliant, {{NON_COMPLIANT_COUNT}} requiring action

Generate the email following professional business format.
```

### Example Output

```
Subject: GSA Onboarding Submission Review - Action Required

Dear Acme Government Solutions Team,

Thank you for submitting your company profile for GSA Schedule registration. We appreciate your interest in partnering with the federal government and have completed our initial review of your submission.

Overall, your submission demonstrates strong capabilities and well-documented past performance. However, we've identified several items that require your attention before we can proceed to the next phase:

1. Unique Entity Identifier (UEI) Required (Rule R1 - Critical)
   Your submission is missing a valid UEI, which is mandatory for all GSA registrations. The UEI is a 12-character identifier issued through SAM.gov that has replaced the legacy DUNS number system.
   
   Action: Please register at SAM.gov and obtain your UEI. This typically takes 3-5 business days.
   Resource: https://sam.gov/content/entity-registration

2. NAICS Code Verification (Rule R2 - High Priority)
   You've listed three NAICS codes (541512, 541519, 541611). We need to verify their mapping to appropriate Special Item Numbers (SINs) and ensure no duplicates per GSA requirements.
   
   Action: Please provide detailed capability statements for each NAICS code, explaining how your company meets the industry classification requirements.

3. Labor Category Details (Rule R4 - Medium Priority)
   Your pricing sheet would benefit from more detailed labor category descriptions, including specific education requirements and years of experience for each position.
   
   Action: Please enhance your labor category descriptions using the attached template.

We want to help you successfully complete this process. Our team is available to answer questions and provide guidance. Please don't hesitate to reach out if you need clarification on any of these items.

Next Steps:
- Please address the items above and resubmit by [DATE + 14 days]
- We recommend scheduling a consultation call if needed - reply to this email to arrange a time
- Once we receive your updated materials, we'll expedite the review process

We're excited about the possibility of working with Acme Government Solutions and look forward to your updated submission.

Best regards,

GSA Contracting Office
Email: contracts@gsa.gov
Phone: (202) 555-0100

This email was generated by the GetGSA automated document processing system with human oversight.
```

---

## Prompt Engineering Guidelines

### Core Principles

1. **Clarity First**
   - Use simple, direct language
   - Avoid ambiguity
   - Provide explicit examples

2. **Structured Outputs**
   - Always specify output format (JSON, text, etc.)
   - Use schemas when possible
   - Validate outputs programmatically

3. **Context Management**
   - Limit context to relevant information only
   - Truncate long documents intelligently (first 3000 chars + last 1000 chars)
   - Prioritize most important sections

4. **Temperature Settings**
   - Classification: 0.1 (deterministic)
   - Extraction: 0.1 (accurate)
   - Generation: 0.3-0.5 (creative but consistent)

5. **Error Handling**
   - Always have fallback responses
   - Validate JSON parsing
   - Log failures for analysis

### Prompt Template Structure

```
[SYSTEM PROMPT: Role + Task + Constraints + Output Format]

[USER PROMPT: Specific Request + Context + Examples]

[OUTPUT FORMAT: Explicit schema or structure]
```

### Testing Prompts

Always test prompts with:
- ✅ Normal cases (clean, complete documents)
- ✅ Edge cases (missing fields, ambiguous content)
- ✅ Adversarial cases (malformed input, very long text)
- ✅ Multi-language cases (if applicable)

---

## Abstention Policies

### When to Abstain

The system should abstain (return "unknown" or null) when:

1. **Low Confidence** (`confidence < 0.8`)
   - Classification uncertainty
   - Ambiguous document content
   - Mixed document types in one file

2. **Insufficient Information**
   - Critical fields completely missing
   - Document appears incomplete
   - Key sections redacted or corrupted

3. **Out of Scope**
   - Document type not in training set
   - Language not supported (non-English)
   - Format not processable

4. **Data Quality Issues**
   - Heavily corrupted text
   - Mostly images without OCR
   - Encrypted or password-protected

### Abstention Response Format

```json
{
  "status": "abstained",
  "reason": "Low confidence in classification",
  "confidence": 0.65,
  "suggestions": [
    "Document contains mixed content",
    "Consider splitting into separate documents",
    "Manual review recommended"
  ],
  "partialResults": {
    "possibleTypes": ["company_profile", "pricing_sheet"],
    "extractedFields": {...}
  }
}
```

### Human-in-the-Loop Integration

For abstained cases:
1. Flag for manual review
2. Provide partial results to reviewer
3. Collect reviewer decision
4. Use for model improvement

---

## Fallback Strategies

### AI Service Unavailable

```javascript
if (aiServiceDown) {
  return {
    status: 'degraded',
    message: 'AI service temporarily unavailable',
    fallback: {
      classification: 'unknown',
      extractedFields: performRuleBasedExtraction(text),
      note: 'Results from rule-based extraction only'
    }
  };
}
```

### Timeout Handling

```javascript
const TIMEOUT_MS = 60000;

try {
  const result = await Promise.race([
    callAIService(prompt),
    timeoutPromise(TIMEOUT_MS)
  ]);
  return result;
} catch (timeoutError) {
  logger.warn('AI service timeout, using cached response');
  return getCachedSimilarResponse(prompt);
}
```

### Invalid Response Parsing

```javascript
function parseAIResponse(response) {
  try {
    return JSON.parse(response);
  } catch (error) {
    // Try extracting JSON from markdown
    const jsonMatch = response.match(/```json\n(.*)\n```/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Fallback to default structure
    logger.error('Failed to parse AI response', { response });
    return getDefaultResponse();
  }
}
```

### Rate Limiting

```javascript
// Implement exponential backoff
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'RATE_LIMIT' && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

---

## Model Configuration

### Ollama Settings

```javascript
{
  model: 'llama3.2',
  options: {
    temperature: 0.1,      // Low for deterministic outputs
    top_p: 0.9,            // Nucleus sampling
    top_k: 40,             // Top-k sampling
    repeat_penalty: 1.1,   // Avoid repetition
    num_ctx: 4096,         // Context window
    num_predict: 1024      // Max tokens to generate
  }
}
```

### Future Model Options

| Task | Recommended Model | Why |
|------|------------------|-----|
| Classification | llama3.2 | Fast, accurate |
| Extraction | llama3.2 | Structured output |
| Generation | llama3.2-70b | Better writing quality |
| RAG | sentence-transformers | Optimized embeddings |

---

## Monitoring & Improvement

### Metrics to Track

1. **Accuracy Metrics**
   - Classification accuracy (vs. human labels)
   - Field extraction precision/recall
   - False positive rate for compliance checks

2. **Performance Metrics**
   - Average response time per task
   - Token usage per request
   - API error rate

3. **Quality Metrics**
   - Abstention rate (should be 5-10%)
   - User correction rate
   - Report readability scores

### Continuous Improvement

```
User Feedback Loop:
1. Collect user corrections
2. Analyze error patterns
3. Update prompts
4. A/B test new prompts
5. Deploy improved versions
```

### Prompt Versioning

```javascript
const PROMPTS = {
  classification: {
    version: 'v2.1',
    lastUpdated: '2024-10-05',
    changelog: 'Added abstention guidance',
    template: '...'
  }
};
```

---

## Best Practices Summary

✅ **DO:**
- Use low temperature for deterministic tasks
- Validate all outputs programmatically
- Implement comprehensive error handling
- Log all AI interactions for debugging
- Version control prompts
- A/B test prompt variations
- Provide examples in prompts
- Set clear output format requirements

❌ **DON'T:**
- Trust AI outputs without validation
- Use high temperature for structured extraction
- Ignore confidence scores
- Skip fallback implementations
- Hardcode prompts in business logic
- Assume AI is always available
- Send PII to external AI services
- Exceed context window limits

---

## Conclusion

These prompts and guidelines form the foundation of GetGSA's AI capabilities. They are designed to be:
- **Reliable**: Consistent, validated outputs
- **Maintainable**: Clear structure, easy to update
- **Scalable**: Can handle varying document types
- **Robust**: Comprehensive error handling
- **Privacy-Focused**: Local processing, PII protection

Regular review and updates of these prompts based on real-world usage will ensure continued system improvement.
