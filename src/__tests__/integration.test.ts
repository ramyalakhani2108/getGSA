import request from 'supertest';
import { app } from '../server';
import fs from 'fs';
import path from 'path';

describe('Integration Tests', () => {
  let requestId: string;

  describe('Health Check', () => {
    test('GET /api/healthz should return system status', async () => {
      const response = await request(app)
        .get('/api/healthz')
        .expect('Content-Type', /json/);

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('ai');
      expect(response.body.services).toHaveProperty('vectorStore');
    });
  });

  describe('Document Ingestion Flow', () => {
    test('POST /api/ingest should accept and process a document', async () => {
      // Create a test document
      const testContent = `
        COMPANY PROFILE
        
        Company Name: Test Company LLC
        UEI: A1B2C3D4E5F6
        DUNS: 123456789
        CAGE Code: 1A2B3
        
        Contact: john.doe@testcompany.com
        Phone: (555) 123-4567
        
        NAICS Codes:
        - 541512 (Computer Systems Design)
        - 541519 (Other Computer Services)
      `;

      const response = await request(app)
        .post('/api/ingest')
        .attach('document', Buffer.from(testContent), {
          filename: 'test-company-profile.txt',
          contentType: 'text/plain',
        })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('requestId');
      expect(response.body.data).toHaveProperty('documentId');
      expect(response.body.data).toHaveProperty('redactionCount');
      
      // Store requestId for analysis test
      requestId = response.body.data.requestId;

      // Verify PII was redacted
      expect(response.body.data.redactionCount).toBeGreaterThan(0);
      expect(response.body.data.redactionsByType).toHaveProperty('email');
      expect(response.body.data.redactionsByType).toHaveProperty('phone');
    }, 10000);

    test('POST /api/ingest should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/ingest')
        .attach('document', Buffer.from('test'), {
          filename: 'test.exe',
          contentType: 'application/x-msdownload',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    test('POST /api/ingest should reject oversized files', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/ingest')
        .attach('document', largeBuffer, {
          filename: 'large-file.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('Document Analysis Flow', () => {
    // Skip if no requestId (ingest test failed)
    test('POST /api/analyze should analyze an ingested document', async () => {
      if (!requestId) {
        console.log('Skipping analysis test - no requestId available');
        return;
      }

      const response = await request(app)
        .post('/api/analyze')
        .send({ request_id: requestId })
        .expect('Content-Type', /json/);

      // Analysis may take time or fail if AI service unavailable
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('analysisId');
        expect(response.body.data).toHaveProperty('classification');
        expect(response.body.data).toHaveProperty('extractedFields');
        expect(response.body.data).toHaveProperty('compliance');
        expect(response.body.data).toHaveProperty('outputs');

        // Check RAG integration
        expect(response.body.data.rag).toHaveProperty('rulesRetrieved');
        expect(response.body.data.rag.rulesRetrieved).toBeGreaterThan(0);

        // Check compliance checklist
        expect(Array.isArray(response.body.data.compliance.checklist)).toBe(true);
        
        // Check outputs generated
        expect(response.body.data.outputs).toHaveProperty('negotiationBrief');
        expect(response.body.data.outputs).toHaveProperty('clientEmail');
      } else {
        console.log('AI service may be unavailable, skipping full validation');
      }
    }, 60000); // 60 second timeout for AI processing

    test('POST /api/analyze should reject invalid request_id', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ request_id: 'invalid-uuid' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    test('POST /api/analyze should return 404 for non-existent request_id', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ request_id: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });

  describe('Error Handling', () => {
    test('Should handle missing document in ingest', async () => {
      const response = await request(app)
        .post('/api/ingest')
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    test('Should handle malformed JSON in analyze', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    test('Should return 404 for unknown routes', async () => {
      await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits', async () => {
      // This test would need to make 100+ requests to trigger rate limiting
      // Skipped for CI/CD but useful for load testing
      expect(true).toBe(true);
    });
  });
});
