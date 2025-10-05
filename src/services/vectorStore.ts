import { ChromaClient, Collection } from 'chromadb';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const CHROMA_PATH = process.env.CHROMA_PATH || path.join(process.cwd(), 'data', 'chroma');
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'gsa_rules';

let client: ChromaClient;
let collection: Collection;

// GSA Rules content (R1-R5)
const GSA_RULES = [
  {
    id: 'R1',
    title: 'Unique Entity Identifier (UEI) Requirement',
    content: `All vendors must provide a valid Unique Entity Identifier (UEI) in their company profile. 
    The UEI is a 12-character alphanumeric identifier assigned by SAM.gov. 
    Missing or invalid UEI is a critical compliance violation that must be flagged immediately.
    Legacy DUNS numbers (9-digit numeric) are no longer accepted as primary identifiers but may be present for reference.`,
    category: 'identification',
    severity: 'critical',
  },
  {
    id: 'R2',
    title: 'NAICS Code to SIN Mapping',
    content: `Each NAICS (North American Industry Classification System) code provided must map to at least one valid Special Item Number (SIN).
    NAICS codes are 6-digit numeric codes that classify business establishments.
    The mapping must be verified and duplicates should be removed per the official GSA SIN to NAICS mapping table.
    Multiple NAICS codes may map to the same SIN, but each unique SIN should only be listed once in the final output.`,
    category: 'classification',
    severity: 'high',
  },
  {
    id: 'R3',
    title: 'Past Performance Contract Value Threshold',
    content: `All past performance contracts listed must have a total value of at least $25,000.
    Contracts below this threshold should be flagged as non-compliant.
    The contract value should be clearly stated in the past performance documentation.
    If contract value is not specified or is below threshold, this is a compliance issue that requires client follow-up.`,
    category: 'past_performance',
    severity: 'high',
  },
  {
    id: 'R4',
    title: 'Pricing Sheet Labor Category Requirements',
    content: `Pricing sheets must include standard labor categories with fully burdened hourly rates.
    Each labor category must specify: job title, education requirements, years of experience, and geographic location.
    Rates should be broken down by: base labor rate, fringe benefits, overhead, G&A (General & Administrative), and profit/fee.
    Missing labor category details or rate breakdowns should be flagged for clarification.`,
    category: 'pricing',
    severity: 'medium',
  },
  {
    id: 'R5',
    title: 'PII Redaction Requirements',
    content: `All Personally Identifiable Information (PII) must be redacted from documents before processing.
    This includes but is not limited to: Social Security Numbers (SSNs), personal email addresses, personal phone numbers, and home addresses.
    Business contact information (company emails, office phone numbers) should be retained.
    Redaction must be performed before any AI processing or storage in the system.
    Each redacted item should be logged with a secure hash for audit purposes.`,
    category: 'security',
    severity: 'critical',
  },
];

/**
 * Initialize ChromaDB client and collection
 */
export async function initializeVectorStore(): Promise<void> {
  try {
    // Ensure chroma directory exists
    if (!fs.existsSync(CHROMA_PATH)) {
      fs.mkdirSync(CHROMA_PATH, { recursive: true });
    }

    // Initialize ChromaDB client
    client = new ChromaClient({
      path: CHROMA_PATH,
    });

    // Get or create collection
    try {
      collection = await client.getCollection({
        name: COLLECTION_NAME,
        embeddingFunction: undefined as any, // ChromaDB will use default
      });
      logger.info('ChromaDB collection loaded');
    } catch (error) {
      collection = await client.createCollection({
        name: COLLECTION_NAME,
        metadata: { description: 'GSA rules and regulations for RAG' },
      });
      logger.info('ChromaDB collection created');

      // Seed with GSA rules
      await seedGSARules();
    }
  } catch (error) {
    logger.error('Failed to initialize vector store:', error);
    throw error;
  }
}

/**
 * Seed the vector store with GSA rules
 */
async function seedGSARules(): Promise<void> {
  try {
    const documents = GSA_RULES.map(rule => rule.content);
    const ids = GSA_RULES.map(rule => rule.id);
    const metadatas = GSA_RULES.map(rule => ({
      title: rule.title,
      category: rule.category,
      severity: rule.severity,
    }));

    await collection.add({
      ids,
      documents,
      metadatas,
    });

    logger.info(`Seeded ${GSA_RULES.length} GSA rules into vector store`);
  } catch (error) {
    logger.error('Failed to seed GSA rules:', error);
    throw error;
  }
}

/**
 * Query vector store for relevant rules
 */
export async function queryRules(
  query: string,
  nResults: number = 3
): Promise<{
  ids: string[];
  documents: string[];
  metadatas: Record<string, any>[];
  distances: number[];
}> {
  try {
    if (!collection) {
      throw new Error('Vector store not initialized');
    }

    const results = await collection.query({
      queryTexts: [query],
      nResults,
    });

    return {
      ids: results.ids[0] || [],
      documents: (results.documents[0] || []).filter((d): d is string => d !== null),
      metadatas: (results.metadatas[0] || []).filter((m): m is Record<string, any> => m !== null),
      distances: results.distances?.[0] || [],
    };
  } catch (error) {
    logger.error('Failed to query rules:', error);
    throw error;
  }
}

/**
 * Get rule by ID
 */
export async function getRuleById(ruleId: string): Promise<{
  id: string;
  content: string;
  metadata: Record<string, any>;
} | null> {
  try {
    if (!collection) {
      throw new Error('Vector store not initialized');
    }

    const results = await collection.get({
      ids: [ruleId],
    });

    if (results.ids.length === 0) {
      return null;
    }

    return {
      id: results.ids[0],
      content: results.documents[0] as string,
      metadata: results.metadatas[0] as Record<string, any>,
    };
  } catch (error) {
    logger.error('Failed to get rule:', error);
    return null;
  }
}

/**
 * Get all rules
 */
export async function getAllRules(): Promise<typeof GSA_RULES> {
  return GSA_RULES;
}

/**
 * Search rules by category
 */
export async function getRulesByCategory(category: string): Promise<typeof GSA_RULES> {
  return GSA_RULES.filter(rule => rule.category === category);
}

/**
 * Get rules by severity
 */
export async function getRulesBySeverity(severity: string): Promise<typeof GSA_RULES> {
  return GSA_RULES.filter(rule => rule.severity === severity);
}

export { GSA_RULES };
