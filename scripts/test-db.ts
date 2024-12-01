import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DIRECT_URL // Try direct connection first
    }
  }
});

async function main() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('Database connection successful!');
    
    // Try to query the database
    const count = await prisma.bookDetails.count();
    console.log('Number of book details in database:', count);
    
    // Try to create a test record
    const testBook = await prisma.bookDetails.upsert({
      where: {
        googleBooksId: 'test-book-id'
      },
      update: {
        chapters: 1
      },
      create: {
        googleBooksId: 'test-book-id',
        chapters: 1
      }
    });
    console.log('Test book record:', testBook);
    
  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 