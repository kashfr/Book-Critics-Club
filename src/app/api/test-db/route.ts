import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Starting database connection test...');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    
    // Test database connection
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('Database connection successful!');
    
    // Get some basic stats
    console.log('Fetching database stats...');
    const stats = {
      users: await prisma.user.count(),
      accounts: await prisma.account.count(),
      sessions: await prisma.session.count(),
    };
    console.log('Stats:', stats);

    // Test connection successful
    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      stats,
      database_url: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
      node_env: process.env.NODE_ENV,
      runtime: process.version,
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      error_details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : null,
      database_url: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
      node_env: process.env.NODE_ENV,
      runtime: process.version,
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 