import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Fetch from Google Books API
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}`);
    if (!response.ok) throw new Error('Failed to fetch book from Google Books API');

    const data = await response.json();

    // Fetch BookDetails from database
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
  } catch (error) {
    console.error('GET - Error fetching book details:', error);
    return NextResponse.json({ error: 'Failed to fetch book details' }, { status: 500 });
  }
}
