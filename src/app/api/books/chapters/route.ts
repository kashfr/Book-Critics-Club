import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function GET(request: Request) {
  console.log('Starting GET request for chapters');
  
  try {
    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.error('Database connection test failed');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    console.log('GET chapters - Received request for bookId:', bookId);

    if (!bookId) {
      console.error('GET chapters - Missing bookId parameter');
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    try {
      // First, try to find existing book details
      const bookDetails = await prisma.bookDetails.findUnique({
        where: {
          googleBooksId: bookId,
        },
      });

      console.log('GET chapters - Found book details:', bookDetails);

      // If no existing record, create one with 0 chapters
      if (!bookDetails) {
        console.log('GET chapters - No existing record, creating new one');
        try {
          const newBookDetails = await prisma.bookDetails.create({
            data: {
              googleBooksId: bookId,
              chapters: 0,
            },
          });
          console.log('GET chapters - Created new record:', newBookDetails);
          return NextResponse.json({ chapters: 0 });
        } catch (createError) {
          console.error('GET chapters - Error creating new record:', createError);
          throw createError;
        }
      }

      return NextResponse.json({
        chapters: bookDetails.chapters,
      });
    } catch (dbError) {
      console.error('GET chapters - Database operation error:', dbError);
      throw dbError;
    }
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
    };
    
    console.error('GET chapters - Error:', errorDetails);

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'Database initialization failed' },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: `Database error: ${error.code}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: errorDetails.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  console.log('Starting POST request for chapters');
  
  try {
    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.error('Database connection test failed');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { bookId, chapters } = body;

    console.log('POST chapters - Received request:', { bookId, chapters });

    if (!bookId || typeof chapters !== 'number') {
      console.error('POST chapters - Invalid input:', { bookId, chapters });
      return NextResponse.json(
        { error: 'Book ID and chapters are required' },
        { status: 400 }
      );
    }

    try {
      const bookDetails = await prisma.bookDetails.upsert({
        where: {
          googleBooksId: bookId,
        },
        update: {
          chapters,
        },
        create: {
          googleBooksId: bookId,
          chapters,
        },
      });

      console.log('POST chapters - Updated book details:', bookDetails);
      return NextResponse.json(bookDetails);
    } catch (dbError) {
      console.error('POST chapters - Database operation error:', dbError);
      throw dbError;
    }
  } catch (error: unknown) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
    };
    
    console.error('POST chapters - Error:', errorDetails);

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'Database initialization failed' },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: `Database error: ${error.code}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: errorDetails.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 