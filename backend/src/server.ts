import app from './app';
import { config } from './config';
import prisma from './prisma/client';

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`  EduPortal Backend Server running on port : ${config.port}`);
  console.log(`  Mode: ${config.nodeEnv}`);
  console.log(`====================================================`);
});

// Gracefully handle server termination
const handleGracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('Express HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Prisma database connection closed successfully.');
    } catch (err) {
      console.error('Error disconnecting Prisma client:', err);
    }
    process.exit(0);
  });

  // Force shutdown after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('Graceful shutdown timed out, force quitting.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
