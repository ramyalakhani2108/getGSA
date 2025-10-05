import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'getgsa.db');

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = getDatabase();

  // Documents table
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      original_hash TEXT NOT NULL,
      redacted_content TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Parsed fields table
  database.exec(`
    CREATE TABLE IF NOT EXISTS parsed_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_value TEXT NOT NULL,
      confidence REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `);

  // Redactions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS redactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      redaction_type TEXT NOT NULL,
      original_value_hash TEXT NOT NULL,
      position_start INTEGER,
      position_end INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `);

  // Analysis results table
  database.exec(`
    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      document_classification TEXT,
      classification_confidence REAL,
      checklist_items TEXT,
      negotiation_brief TEXT,
      client_email TEXT,
      rule_citations TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_request_id ON documents(request_id);
    CREATE INDEX IF NOT EXISTS idx_parsed_fields_document_id ON parsed_fields(document_id);
    CREATE INDEX IF NOT EXISTS idx_redactions_document_id ON redactions(document_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_request_id ON analysis_results(request_id);
  `);

  logger.info('Database schema initialized');
}

export interface Document {
  id: string;
  request_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  original_hash: string;
  redacted_content: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedField {
  id: number;
  document_id: string;
  field_name: string;
  field_value: string;
  confidence: number | null;
  created_at: string;
}

export interface Redaction {
  id: number;
  document_id: string;
  redaction_type: string;
  original_value_hash: string;
  position_start: number | null;
  position_end: number | null;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  request_id: string;
  document_classification: string | null;
  classification_confidence: number | null;
  checklist_items: string | null;
  negotiation_brief: string | null;
  client_email: string | null;
  rule_citations: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
