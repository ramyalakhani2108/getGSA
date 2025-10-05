import { logger } from '../utils/logger';

// Simple in-memory vector store implementation
// This replaces ChromaDB for the demo to avoid complex setup issues

interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

interface QueryResult {
  ids: string[];
  documents: string[];
  metadatas: Record<string, any>[];
  distances: number[];
}

class SimpleVectorStore {
  private documents: VectorDocument[] = [];

  constructor() {
    this.initializeWithGSARules();
  }

  private initializeWithGSARules() {
    const GSA_RULES = [
      {
        id: 'R1',
        title: 'Unique Entity Identifier (UEI) Requirement',
        content: 'All vendors must provide a valid Unique Entity Identifier (UEI) in their company profile. The UEI is a 12-character alphanumeric identifier assigned by SAM.gov. Missing or invalid UEI is a critical compliance violation that must be flagged immediately. Legacy DUNS numbers (9-digit numeric) are no longer accepted as primary identifiers but may be present for reference.',
        category: 'identification',
        severity: 'critical',
      },
      {
        id: 'R2',
        title: 'NAICS Code to SIN Mapping',
        content: 'Each NAICS (North American Industry Classification System) code provided must map to at least one valid Special Item Number (SIN). NAICS codes are 6-digit numeric codes that classify business establishments. The mapping must be verified and duplicates should be removed per the official GSA SIN to NAICS mapping table. Multiple NAICS codes may map to the same SIN, but each unique SIN should only be listed once in the final output.',
        category: 'classification',
        severity: 'high',
      },
      {
        id: 'R3',
        title: 'Contract Value Threshold',
        content: 'All GSA contracts must be valued at $25,000 or more to be eligible for award. Contracts below this threshold are not permitted under GSA regulations. This is a mandatory minimum that cannot be waived or reduced.',
        category: 'financial',
        severity: 'critical',
      },
      {
        id: 'R4',
        title: 'Labor Category Requirements',
        content: 'All service contracts must specify labor categories with clear job titles, required qualifications, and minimum experience requirements. Each labor category must include education requirements, years of experience, certifications, and clearance levels if applicable. Labor categories must be distinct and not overlap in responsibilities.',
        category: 'labor',
        severity: 'high',
      },
      {
        id: 'R5',
        title: 'PII Redaction Requirements',
        content: 'All personally identifiable information (PII) must be redacted from submitted documents before processing. PII includes names, addresses, phone numbers, email addresses, Social Security Numbers, and financial account information. Redaction must be complete and irreversible. Partial redaction is not acceptable.',
        category: 'security',
        severity: 'critical',
      },
    ];

    this.documents = GSA_RULES.map(rule => ({
      id: rule.id,
      content: rule.content,
      metadata: {
        title: rule.title,
        category: rule.category,
        severity: rule.severity,
      },
    }));

    logger.info(`Simple vector store initialized with ${this.documents.length} GSA rules`);
  }

  async query(options: { queryTexts: string[]; nResults?: number }): Promise<QueryResult> {
    const { queryTexts, nResults = 5 } = options;
    const query = queryTexts[0].toLowerCase();

    // Simple text-based similarity search
    const scored = this.documents.map(doc => {
      const content = doc.content.toLowerCase();
      const title = doc.metadata.title.toLowerCase();

      let score = 0;
      const queryWords = query.split(/\s+/);
      for (const word of queryWords) {
        if (content.includes(word)) score += 2;
        if (title.includes(word)) score += 3;
      }

      return { doc, score };
    });

    const topResults = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, nResults);

    return {
      ids: topResults.map(item => item.doc.id),
      documents: topResults.map(item => item.doc.content),
      metadatas: topResults.map(item => item.doc.metadata),
      distances: topResults.map(item => 1 - (item.score / 10)),
    };
  }

  async getAllDocuments(): Promise<VectorDocument[]> {
    return this.documents;
  }
}

// Mock ChromaDB collection interface
class SimpleCollection {
  private store: SimpleVectorStore;

  constructor() {
    this.store = new SimpleVectorStore();
  }

  async query(options: { queryTexts: string[]; nResults?: number }): Promise<QueryResult> {
    return this.store.query(options);
  }
}

// Global instance
let collection: SimpleCollection;

/**
 * Initialize the vector store
 */
export async function initializeVectorStore(): Promise<void> {
  try {
    collection = new SimpleCollection();
    logger.info('Simple vector store initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize vector store:', error);
    throw error;
  }
}

/**
 * Query the vector store for relevant rules
 */
export async function queryRules(query: string, nResults = 3): Promise<QueryResult> {
  if (!collection) {
    throw new Error('Vector store not initialized');
  }

  try {
    return await collection.query({
      queryTexts: [query],
      nResults,
    });
  } catch (error) {
    logger.error('Failed to query rules:', error);
    throw error;
  }
}

/**
 * Get a specific rule by ID
 */
export async function getRuleById(id: string): Promise<VectorDocument | null> {
  if (!collection) {
    throw new Error('Vector store not initialized');
  }

  try {
    const store = (collection as any).store as SimpleVectorStore;
    const docs = await store.getAllDocuments();
    return docs.find((doc: VectorDocument) => doc.id === id) || null;
  } catch (error) {
    logger.error('Failed to get rule by ID:', error);
    throw error;
  }
}

/**
 * Get all rules
 */
export async function getAllRules(): Promise<VectorDocument[]> {
  if (!collection) {
    throw new Error('Vector store not initialized');
  }

  try {
    const store = (collection as any).store as SimpleVectorStore;
    return await store.getAllDocuments();
  } catch (error) {
    logger.error('Failed to get all rules:', error);
    throw error;
  }
}
