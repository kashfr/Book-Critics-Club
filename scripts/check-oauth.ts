import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function main() {
  console.log('Starting database check...');
  console.log('Database URL:', process.env.DIRECT_URL?.replace(/:[^:@]+@/, ':****@'));
  
  try {
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('Successfully connected to database!');

    console.log('\nChecking database connection and OAuth-related tables...\n');

    // Check users
    console.log('Counting users...');
    const userCount = await prisma.user.count();
    console.log(`Total users in database: ${userCount}`);
    
    console.log('\nFetching user details...');
    const users = await prisma.user.findMany({
      include: {
        accounts: true,
      },
    });

    console.log('\nUser details:');
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Number of linked accounts:', user.accounts.length);
      
      user.accounts.forEach((account, accIndex) => {
        console.log(`\n  Account ${accIndex + 1}:`);
        console.log('  Provider:', account.provider);
        console.log('  Type:', account.type);
      });
    });

    // Check accounts
    console.log('\nCounting OAuth accounts...');
    const accountCount = await prisma.account.count();
    console.log(`Total OAuth accounts: ${accountCount}`);

    // Check sessions
    console.log('\nCounting active sessions...');
    const sessionCount = await prisma.session.count();
    console.log(`Total active sessions: ${sessionCount}`);

  } catch (error) {
    console.error('Error checking database:', error);
    process.exit(1);
  } finally {
    console.log('\nClosing database connection...');
    await prisma.$disconnect();
    console.log('Database connection closed.');
  }
}

// Add error handling for unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 