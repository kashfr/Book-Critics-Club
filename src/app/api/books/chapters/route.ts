import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    console.log('GET - Fetching chapters for bookId:', bookId);

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    const bookDetails = await prisma.bookDetails.findUnique({
      where: {
        googleBooksId: bookId,
      },
    });
    console.log('GET - Found book details:', bookDetails);

    return NextResponse.json({
      chapters: bookDetails?.chapters ?? 0,
      googleBooksId: bookId,
    });
  } catch (error) {
    console.error('GET - Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('POST - Received body:', body);
    
    const { bookId, chapters } = body;
    
    if (!bookId || typeof chapters !== 'number') {
      console.log('POST - Invalid input data');
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

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
    
    console.log('POST - Updated book details:', bookDetails);
    return NextResponse.json({ 
      success: true, 
      data: bookDetails,
      chapters: bookDetails.chapters 
    });
  } catch (error) {
    console.error('POST - Error updating chapters:', error);
    return NextResponse.json(
      { error: 'Failed to update chapters' },
      { status: 500 }
    );
  }
} 