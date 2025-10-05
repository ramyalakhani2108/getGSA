import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { DocumentRepository, AnalysisRepository } from '../db/repositories';
import { queryRules } from '../services/vectorStore';
import {
  classifyDocument,
  extractFields,
  generateChecklist,
  generateNegotiationBrief,
  generateClientEmail,
} from '../services/aiService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Request validation schema
const analyzeSchema = Joi.object({
  request_id: Joi.string().uuid().required(),
});

interface AnalyzeRequest extends Request {
  body: {
    request_id: string;
  };
}

router.post(
  '/',
  async (req: AnalyzeRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const { error, value } = analyzeSchema.validate(req.body);
      if (error) {
        throw new AppError(400, error.details[0].message);
      }

      const { request_id } = value;
      const analysisId = uuidv4();

      logger.info('Starting document analysis', { request_id, analysisId });

      // Get documents for this request
      const documents = DocumentRepository.findByRequestId(request_id);
      
      if (documents.length === 0) {
        throw new AppError(404, `No documents found for request_id: ${request_id}`);
      }

      // For now, analyze the first document (can be extended for multiple documents)
      const document = documents[0];
      const redactedText = document.redacted_content || '';

      // Create initial analysis record
      AnalysisRepository.create({
        id: analysisId,
        request_id,
        document_classification: null,
        classification_confidence: null,
        checklist_items: null,
        negotiation_brief: null,
        client_email: null,
        rule_citations: null,
        status: 'processing',
        error_message: null,
      });

      // Step 1: Classify document
      logger.info('Classifying document', { analysisId });
      const classification = await classifyDocument(redactedText);

      // Update with classification
      AnalysisRepository.update(analysisId, {
        document_classification: classification.documentType,
        classification_confidence: classification.confidence,
      });

      // If classification abstained, return early
      if (classification.shouldAbstain) {
        AnalysisRepository.update(analysisId, {
          status: 'completed_with_warnings',
          error_message: `Low confidence classification: ${classification.reasoning}`,
        });

        res.status(200).json({
          status: 'success',
          message: 'Analysis completed with warnings',
          data: {
            analysisId,
            requestId: request_id,
            classification: {
              documentType: classification.documentType,
              confidence: classification.confidence,
              reasoning: classification.reasoning,
              abstained: true,
            },
            warning: 'Classification confidence too low for detailed analysis',
          },
        });
        return;
      }

      // Step 2: Extract fields
      logger.info('Extracting fields', { analysisId, documentType: classification.documentType });
      const fieldExtraction = await extractFields(redactedText, classification.documentType);

      // Step 3: Query relevant rules using RAG
      logger.info('Querying relevant rules', { analysisId });
      const ruleQuery = `${classification.documentType} compliance requirements ${JSON.stringify(fieldExtraction.fields)}`;
      const relevantRules = await queryRules(ruleQuery, 5);

      const rulesData = relevantRules.ids.map((id, index) => ({
        id,
        content: relevantRules.documents[index],
        metadata: relevantRules.metadatas[index],
      }));

      // Step 4: Generate compliance checklist
      logger.info('Generating compliance checklist', { analysisId });
      const checklist = await generateChecklist(
        fieldExtraction.fields,
        classification.documentType,
        rulesData
      );

      // Step 5: Generate negotiation brief
      logger.info('Generating negotiation brief', { analysisId });
      const negotiationBrief = await generateNegotiationBrief(
        checklist,
        fieldExtraction.fields,
        classification.documentType
      );

      // Step 6: Generate client email
      logger.info('Generating client email', { analysisId });
      const companyName = fieldExtraction.fields.company_name || 'valued partner';
      const clientEmail = await generateClientEmail(checklist, companyName);

      // Update analysis with results
      AnalysisRepository.update(analysisId, {
        checklist_items: JSON.stringify(checklist),
        negotiation_brief: negotiationBrief,
        client_email: clientEmail,
        rule_citations: JSON.stringify(relevantRules.ids),
        status: 'completed',
      });

      logger.info('Document analysis completed successfully', { analysisId, request_id });

      // Return comprehensive results
      res.status(200).json({
        status: 'success',
        message: 'Document analyzed successfully',
        data: {
          analysisId,
          requestId: request_id,
          classification: {
            documentType: classification.documentType,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
          },
          extractedFields: {
            fields: fieldExtraction.fields,
            confidence: fieldExtraction.confidence,
            count: fieldExtraction.extractedCount,
          },
          rag: {
            rulesRetrieved: relevantRules.ids.length,
            ruleCitations: relevantRules.ids,
            rules: rulesData.map(r => ({
              id: r.id,
              title: r.metadata.title,
              category: r.metadata.category,
              severity: r.metadata.severity,
            })),
          },
          compliance: {
            checklist,
            compliantCount: checklist.filter(item => item.status === 'compliant').length,
            nonCompliantCount: checklist.filter(item => item.status === 'non_compliant').length,
            needsReviewCount: checklist.filter(item => item.status === 'needs_review').length,
          },
          outputs: {
            negotiationBrief,
            clientEmail,
          },
          processedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Log error and update analysis status
      logger.error('Analysis failed', { error, request_id: req.body.request_id });
      
      next(error);
    }
  }
);

export { router as analyzeRouter };
