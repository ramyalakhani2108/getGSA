import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  parseDocument,
  validateDocumentSize,
  validateFileType,
  sanitizeFilename,
} from '../services/documentParser';
import { redactPII } from '../services/redaction';
import { DocumentRepository, RedactionRepository } from '../db/repositories';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    try {
      validateFileType(file.mimetype);
      cb(null, true);
    } catch (error) {
      cb(error as Error);
    }
  },
});

interface IngestRequest extends Request {
  body: {
    metadata?: string;
  };
}

router.post(
  '/',
  upload.single('document'),
  async (req: IngestRequest, res: Response, next: NextFunction) => {
    try {
      // Validate file upload
      if (!req.file) {
        throw new AppError(400, 'No document provided');
      }

      const file = req.file;
      const requestId = uuidv4();
      const documentId = uuidv4();

      logger.info('Processing document ingestion', {
        requestId,
        filename: file.originalname,
        size: file.size,
        type: file.mimetype,
      });

      // Validate document size
      validateDocumentSize(file.size);

      // Sanitize filename
      const sanitizedFilename = sanitizeFilename(file.originalname);

      // Parse document
      const parsed = await parseDocument(file.buffer, file.mimetype);

      // Generate hash of original content
      const originalHash = crypto
        .createHash('sha256')
        .update(parsed.text)
        .digest('hex');

      // Redact PII
      const redactionResult = redactPII(parsed.text);

      // Store document in database
      DocumentRepository.create({
        request_id: requestId,
        filename: sanitizedFilename,
        file_type: file.mimetype,
        file_size: file.size,
        original_hash: originalHash,
        redacted_content: redactionResult.redactedText,
        metadata: req.body.metadata || JSON.stringify(parsed.metadata || {}),
      });

      // Store redactions
      if (redactionResult.matches.length > 0) {
        RedactionRepository.bulkCreate(
          redactionResult.matches.map(match => ({
            document_id: documentId,
            redaction_type: match.type,
            original_value_hash: match.hash,
            position_start: match.start,
            position_end: match.end,
          }))
        );
      }

      // Generate document summary
      const summary = {
        documentId,
        requestId,
        filename: sanitizedFilename,
        fileSize: file.size,
        fileType: file.mimetype,
        pageCount: parsed.pageCount,
        redactionCount: redactionResult.redactionCount,
        redactionsByType: {
          email: redactionResult.matches.filter(m => m.type === 'email').length,
          phone: redactionResult.matches.filter(m => m.type === 'phone').length,
          ssn: redactionResult.matches.filter(m => m.type === 'ssn').length,
        },
        textLength: redactionResult.redactedText.length,
        processedAt: new Date().toISOString(),
      };

      logger.info('Document ingested successfully', {
        requestId,
        documentId,
        redactionCount: redactionResult.redactionCount,
      });

      res.status(200).json({
        status: 'success',
        message: 'Document ingested and redacted successfully',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as ingestRouter };
