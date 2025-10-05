import { getDatabase, Document, ParsedField, Redaction, AnalysisResult } from './database';
import { v4 as uuidv4 } from 'uuid';

export class DocumentRepository {
  static create(doc: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Document {
    const db = getDatabase();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO documents (id, request_id, filename, file_type, file_size, original_hash, redacted_content, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      doc.request_id,
      doc.filename,
      doc.file_type,
      doc.file_size,
      doc.original_hash,
      doc.redacted_content,
      doc.metadata
    );

    return this.findById(id)!;
  }

  static findById(id: string): Document | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
    return stmt.get(id) as Document | undefined;
  }

  static findByRequestId(requestId: string): Document[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM documents WHERE request_id = ?');
    return stmt.all(requestId) as Document[];
  }

  static update(id: string, updates: Partial<Document>): void {
    const db = getDatabase();
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    
    const stmt = db.prepare(`
      UPDATE documents 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const values = fields.map(f => (updates as any)[f]);
    stmt.run(...values, id);
  }
}

export class ParsedFieldRepository {
  static create(field: Omit<ParsedField, 'id' | 'created_at'>): ParsedField {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      INSERT INTO parsed_fields (document_id, field_name, field_value, confidence)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(
      field.document_id,
      field.field_name,
      field.field_value,
      field.confidence
    );

    return this.findById(info.lastInsertRowid as number)!;
  }

  static findById(id: number): ParsedField | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM parsed_fields WHERE id = ?');
    return stmt.get(id) as ParsedField | undefined;
  }

  static findByDocumentId(documentId: string): ParsedField[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM parsed_fields WHERE document_id = ?');
    return stmt.all(documentId) as ParsedField[];
  }

  static bulkCreate(fields: Omit<ParsedField, 'id' | 'created_at'>[]): void {
    const db = getDatabase();
    const insert = db.prepare(`
      INSERT INTO parsed_fields (document_id, field_name, field_value, confidence)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction((items: Omit<ParsedField, 'id' | 'created_at'>[]) => {
      for (const field of items) {
        insert.run(field.document_id, field.field_name, field.field_value, field.confidence);
      }
    });

    transaction(fields);
  }
}

export class RedactionRepository {
  static create(redaction: Omit<Redaction, 'id' | 'created_at'>): Redaction {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      INSERT INTO redactions (document_id, redaction_type, original_value_hash, position_start, position_end)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      redaction.document_id,
      redaction.redaction_type,
      redaction.original_value_hash,
      redaction.position_start,
      redaction.position_end
    );

    return this.findById(info.lastInsertRowid as number)!;
  }

  static findById(id: number): Redaction | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM redactions WHERE id = ?');
    return stmt.get(id) as Redaction | undefined;
  }

  static findByDocumentId(documentId: string): Redaction[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM redactions WHERE document_id = ?');
    return stmt.all(documentId) as Redaction[];
  }

  static bulkCreate(redactions: Omit<Redaction, 'id' | 'created_at'>[]): void {
    const db = getDatabase();
    const insert = db.prepare(`
      INSERT INTO redactions (document_id, redaction_type, original_value_hash, position_start, position_end)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items: Omit<Redaction, 'id' | 'created_at'>[]) => {
      for (const redaction of items) {
        insert.run(
          redaction.document_id,
          redaction.redaction_type,
          redaction.original_value_hash,
          redaction.position_start,
          redaction.position_end
        );
      }
    });

    transaction(redactions);
  }
}

export class AnalysisRepository {
  static create(analysis: Omit<AnalysisResult, 'created_at' | 'updated_at'>): AnalysisResult {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      INSERT INTO analysis_results (
        id, request_id, document_classification, classification_confidence,
        checklist_items, negotiation_brief, client_email, rule_citations, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      analysis.id,
      analysis.request_id,
      analysis.document_classification,
      analysis.classification_confidence,
      analysis.checklist_items,
      analysis.negotiation_brief,
      analysis.client_email,
      analysis.rule_citations,
      analysis.status,
      analysis.error_message
    );

    return this.findById(analysis.id)!;
  }

  static findById(id: string): AnalysisResult | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM analysis_results WHERE id = ?');
    return stmt.get(id) as AnalysisResult | undefined;
  }

  static findByRequestId(requestId: string): AnalysisResult | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM analysis_results WHERE request_id = ? ORDER BY created_at DESC LIMIT 1');
    return stmt.get(requestId) as AnalysisResult | undefined;
  }

  static update(id: string, updates: Partial<AnalysisResult>): void {
    const db = getDatabase();
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    
    const stmt = db.prepare(`
      UPDATE analysis_results 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const values = fields.map(f => (updates as any)[f]);
    stmt.run(...values, id);
  }
}
