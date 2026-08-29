import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import prisma from './config/database.js';

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
      logger.info(`API: http://localhost:${env.port}${env.apiPrefix}`);
      logger.info(`Swagger: http://localhost:${env.port}/api-docs`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
