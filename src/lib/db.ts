import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Configure Neon for serverless WebSocket
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Neon connection pool
const connectionString = process.env.DATABASE_URL;

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // Production: Use Neon serverless driver with connection pooling
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Development: Use standard Prisma client with connection reuse
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };

// Helper function to handle database errors
export function handleDatabaseError(error: any): never {
  console.error('Database error:', error);
  
  if (error.code === 'P2002') {
    throw new Error('A record with this unique field already exists');
  }
  
  if (error.code === 'P2025') {
    throw new Error('Record not found');
  }
  
  if (error.code === 'P2003') {
    throw new Error('Foreign key constraint failed');
  }
  
  throw new Error('Database operation failed');
}
