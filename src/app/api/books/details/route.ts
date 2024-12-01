import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      console.error('Book details API: Missing ID parameter');
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    console.log('Fetching book details for ID:', id);

    // Fetch from Google Books API
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}`);
    
    if (!response.ok) {
      console.error('Google Books API error:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched from Google Books API');

    // Fetch BookDetails from database
    try {
      const bookDetails = await prisma.bookDetails.findUnique({
        where: {
          googleBooksId: id,
        },
      });

      console.log('Fetched book details from DB:', bookDetails);

      // Combine data
      const combinedData = {
        ...data,
        googleBooksId: id,
        chapters: bookDetails?.chapters ?? 0,
      };

      return NextResponse.json(combinedData);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Still return the Google Books data even if DB fails
      return NextResponse.json({
        ...data,
        googleBooksId: id,
        chapters: 0,
      });
    }
  } catch (error) {
    console.error('GET - Error fetching book details:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch book details'
      },
      { status: 500 }
    );
  }
}
