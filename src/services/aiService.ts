import axios from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.8');

export interface ClassificationResult {
  documentType: 'company_profile' | 'past_performance' | 'pricing_sheet' | 'unknown';
  confidence: number;
  reasoning: string;
  shouldAbstain: boolean;
}

export interface FieldExtractionResult {
  fields: Record<string, any>;
  confidence: number;
  extractedCount: number;
}

export interface ChecklistItem {
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'needs_review';
  evidence: string;
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Call Ollama API for text generation
 */
async function callOllama(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
        },
      },
      {
        timeout: 60000, // 60 second timeout
      }
    );

    return response.data.response || '';
  } catch (error) {
    logger.error('Ollama API call failed:', error);
    
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      throw new AppError(503, 'AI service unavailable. Please ensure Ollama is running.');
    }
    
    throw new AppError(500, 'Failed to process AI request');
  }
}

/**
 * Classify document type using LLM
 */
export async function classifyDocument(text: string): Promise<ClassificationResult> {
  const systemPrompt = `You are an expert document classifier for government contracting. 
Your task is to classify documents into one of these categories: company_profile, past_performance, pricing_sheet, or unknown.
Respond ONLY with a JSON object in this exact format:
{
  "documentType": "category",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

  const prompt = `Classify the following document. If confidence is below ${CONFIDENCE_THRESHOLD}, set documentType to "unknown".

Document content:
${text.substring(0, 3000)}

Respond with JSON only:`;

  try {
    const response = await callOllama(prompt, systemPrompt);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      documentType: result.documentType || 'unknown',
      confidence: result.confidence || 0,
      reasoning: result.reasoning || 'No reasoning provided',
      shouldAbstain: result.confidence < CONFIDENCE_THRESHOLD,
    };
  } catch (error) {
    logger.error('Document classification failed:', error);
    
    return {
      documentType: 'unknown',
      confidence: 0,
      reasoning: 'Classification failed due to error',
      shouldAbstain: true,
    };
  }
}

/**
 * Extract structured fields from document based on type
 */
export async function extractFields(
  text: string,
  documentType: string
): Promise<FieldExtractionResult> {
  let systemPrompt = '';
  let fieldsToExtract: string[] = [];

  switch (documentType) {
    case 'company_profile':
      fieldsToExtract = ['UEI', 'DUNS', 'company_name', 'NAICS_codes', 'cage_code'];
      systemPrompt = `Extract the following fields from a company profile document:
- UEI: 12-character alphanumeric Unique Entity Identifier
- DUNS: 9-digit legacy identifier
- company_name: Official company name
- NAICS_codes: Array of 6-digit NAICS codes
- cage_code: Commercial and Government Entity Code

Respond ONLY with JSON.`;
      break;

    case 'past_performance':
      fieldsToExtract = ['contract_number', 'client_name', 'contract_value', 'start_date', 'end_date', 'description'];
      systemPrompt = `Extract the following fields from a past performance document:
- contract_number: Contract identification number
- client_name: Name of the contracting organization
- contract_value: Total contract value in dollars (numeric)
- start_date: Contract start date
- end_date: Contract end date
- description: Brief description of work performed

Respond ONLY with JSON.`;
      break;

    case 'pricing_sheet':
      fieldsToExtract = ['labor_categories', 'rates', 'geographic_location', 'escalation_rate'];
      systemPrompt = `Extract the following fields from a pricing sheet:
- labor_categories: Array of labor category objects with title, education, experience
- rates: Array of rate objects with category, hourly_rate, breakdown
- geographic_location: Geographic area for rates
- escalation_rate: Annual escalation percentage

Respond ONLY with JSON.`;
      break;

    default:
      return {
        fields: {},
        confidence: 0,
        extractedCount: 0,
      };
  }

  const prompt = `Extract the specified fields from this document. For missing fields, use null.

Document content:
${text.substring(0, 3000)}

Respond with JSON containing these fields: ${fieldsToExtract.join(', ')}`;

  try {
    const response = await callOllama(prompt, systemPrompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const fields = JSON.parse(jsonMatch[0]);
    const extractedCount = Object.values(fields).filter(v => v !== null && v !== '').length;

    return {
      fields,
      confidence: extractedCount / fieldsToExtract.length,
      extractedCount,
    };
  } catch (error) {
    logger.error('Field extraction failed:', error);
    
    return {
      fields: {},
      confidence: 0,
      extractedCount: 0,
    };
  }
}

/**
 * Generate compliance checklist based on extracted fields and rules
 */
export async function generateChecklist(
  fields: Record<string, any>,
  documentType: string,
  _relevantRules: Array<{ id: string; content: string; metadata: Record<string, any> }>
): Promise<ChecklistItem[]> {
  const checklist: ChecklistItem[] = [];

  // Check UEI requirement (R1)
  if (documentType === 'company_profile') {
    const uei = fields.UEI;
    const ueiPattern = /^[A-Z0-9]{12}$/;
    
    if (!uei || !ueiPattern.test(uei)) {
      checklist.push({
        requirement: 'Valid UEI Required',
        status: 'non_compliant',
        evidence: uei ? `Invalid UEI format: ${uei}` : 'UEI not found in document',
        ruleId: 'R1',
        severity: 'critical',
      });
    } else {
      checklist.push({
        requirement: 'Valid UEI Required',
        status: 'compliant',
        evidence: `Valid UEI found: ${uei}`,
        ruleId: 'R1',
        severity: 'critical',
      });
    }
  }

  // Check NAICS to SIN mapping (R2)
  if (documentType === 'company_profile' && fields.NAICS_codes) {
    const naicsCodes = Array.isArray(fields.NAICS_codes) ? fields.NAICS_codes : [fields.NAICS_codes];
    
    if (naicsCodes.length > 0) {
      checklist.push({
        requirement: 'NAICS Code to SIN Mapping',
        status: 'needs_review',
        evidence: `Found ${naicsCodes.length} NAICS code(s): ${naicsCodes.join(', ')}. Requires mapping verification.`,
        ruleId: 'R2',
        severity: 'high',
      });
    } else {
      checklist.push({
        requirement: 'NAICS Code to SIN Mapping',
        status: 'non_compliant',
        evidence: 'No NAICS codes found in document',
        ruleId: 'R2',
        severity: 'high',
      });
    }
  }

  // Check contract value threshold (R3)
  if (documentType === 'past_performance' && fields.contract_value !== undefined) {
    const value = parseFloat(String(fields.contract_value).replace(/[^0-9.]/g, ''));
    
    if (value >= 25000) {
      checklist.push({
        requirement: 'Contract Value >= $25,000',
        status: 'compliant',
        evidence: `Contract value: $${value.toLocaleString()}`,
        ruleId: 'R3',
        severity: 'high',
      });
    } else {
      checklist.push({
        requirement: 'Contract Value >= $25,000',
        status: 'non_compliant',
        evidence: `Contract value $${value.toLocaleString()} is below $25,000 threshold`,
        ruleId: 'R3',
        severity: 'high',
      });
    }
  }

  // Check pricing requirements (R4)
  if (documentType === 'pricing_sheet') {
    if (fields.labor_categories && Array.isArray(fields.labor_categories) && fields.labor_categories.length > 0) {
      checklist.push({
        requirement: 'Labor Category Details',
        status: 'compliant',
        evidence: `Found ${fields.labor_categories.length} labor categories with details`,
        ruleId: 'R4',
        severity: 'medium',
      });
    } else {
      checklist.push({
        requirement: 'Labor Category Details',
        status: 'non_compliant',
        evidence: 'Labor categories missing or incomplete',
        ruleId: 'R4',
        severity: 'medium',
      });
    }
  }

  return checklist;
}

/**
 * Generate negotiation brief
 */
export async function generateNegotiationBrief(
  checklist: ChecklistItem[],
  fields: Record<string, any>,
  documentType: string
): Promise<string> {
  const nonCompliantItems = checklist.filter(item => item.status === 'non_compliant');
  const needsReviewItems = checklist.filter(item => item.status === 'needs_review');

  const systemPrompt = `You are a GSA contract negotiation specialist. Generate a concise negotiation brief (max 500 words) that:
1. Summarizes key compliance issues
2. Provides actionable recommendations
3. Cites specific rule violations
4. Suggests negotiation strategies

Be professional and direct.`;

  const prompt = `Generate a negotiation brief for a ${documentType} document.

Non-compliant items: ${nonCompliantItems.length}
${nonCompliantItems.map(item => `- ${item.requirement}: ${item.evidence} (${item.ruleId})`).join('\n')}

Items needing review: ${needsReviewItems.length}
${needsReviewItems.map(item => `- ${item.requirement}: ${item.evidence} (${item.ruleId})`).join('\n')}

Key fields extracted:
${JSON.stringify(fields, null, 2)}

Generate brief:`;

  try {
    const brief = await callOllama(prompt, systemPrompt);
    return brief.trim();
  } catch (error) {
    logger.error('Failed to generate negotiation brief:', error);
    return 'Unable to generate negotiation brief due to AI service error.';
  }
}

/**
 * Generate client email
 */
export async function generateClientEmail(
  checklist: ChecklistItem[],
  companyName: string = 'valued partner'
): Promise<string> {
  const issues = checklist.filter(item => item.status !== 'compliant');

  const systemPrompt = `You are a professional GSA contract specialist. Generate a polite, professional email to a client addressing compliance issues. Be diplomatic but clear about requirements.`;

  const prompt = `Generate a professional email to ${companyName} addressing the following compliance items:

${issues.map(item => `- ${item.requirement} (${item.ruleId}): ${item.evidence}`).join('\n')}

The email should:
1. Thank them for their submission
2. Clearly list what needs to be addressed
3. Provide specific guidance
4. Offer assistance
5. Set expectations for next steps

Generate email:`;

  try {
    const email = await callOllama(prompt, systemPrompt);
    return email.trim();
  } catch (error) {
    logger.error('Failed to generate client email:', error);
    return 'Unable to generate client email due to AI service error.';
  }
}

/**
 * Health check for AI service
 */
export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}
