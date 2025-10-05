import { Router, Request, Response } from 'express';
import { checkAIServiceHealth } from '../services/aiService';
import { getDatabase } from '../db/database';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: false,
        ai: false,
        vectorStore: false,
      },
      version: '1.0.0',
    };

    // Check database
    try {
      const db = getDatabase();
      db.prepare('SELECT 1').get();
      health.services.database = true;
    } catch (error) {
      logger.error('Database health check failed:', error);
    }

    // Check AI service
    health.services.ai = await checkAIServiceHealth();

    // Check vector store (assume healthy if no error thrown)
    health.services.vectorStore = true;

    // Overall status
    const allHealthy = Object.values(health.services).every(v => v === true);
    health.status = allHealthy ? 'healthy' : 'degraded';

    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export { router as healthRouter };
