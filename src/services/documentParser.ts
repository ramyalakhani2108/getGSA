import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { AppError } from '../middleware/errorHandler';

export interface ParsedDocument {
  text: string;
  pageCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Parse PDF document
 */
async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const data = await pdf(buffer);
    
    return {
      text: data.text,
      pageCount: data.numpages,
      metadata: data.info,
    };
  } catch (error) {
    throw new AppError(400, `Failed to parse PDF: ${(error as Error).message}`);
  }
}

/**
 * Parse DOCX document
 */
async function parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      metadata: {
        messages: result.messages,
      },
    };
  } catch (error) {
    throw new AppError(400, `Failed to parse DOCX: ${(error as Error).message}`);
  }
}

/**
 * Parse TXT document
 */
async function parseTXT(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const text = buffer.toString('utf-8');
    
    return {
      text,
      metadata: {
        encoding: 'utf-8',
      },
    };
  } catch (error) {
    throw new AppError(400, `Failed to parse TXT: ${(error as Error).message}`);
  }
}

/**
 * Main document parser - routes to appropriate parser based on file type
 */
export async function parseDocument(buffer: Buffer, mimeType: string): Promise<ParsedDocument> {
  switch (mimeType) {
    case 'application/pdf':
      return parsePDF(buffer);
    
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return parseDOCX(buffer);
    
    case 'text/plain':
      return parseTXT(buffer);
    
    default:
      throw new AppError(400, `Unsupported file type: ${mimeType}`);
  }
}

/**
 * Validate document size
 */
export function validateDocumentSize(size: number, maxSizeMB: number = 10): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (size > maxSizeBytes) {
    throw new AppError(400, `File size exceeds maximum allowed size of ${maxSizeMB}MB`);
  }
}

/**
 * Validate file type
 */
export function validateFileType(mimeType: string): void {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ];
  
  if (!allowedTypes.includes(mimeType)) {
    throw new AppError(400, `File type not supported: ${mimeType}`);
  }
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .trim();
}
