import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = searchParams.get('page') || '1';
    const limit = 40;
    const startIndex = (Number(page) - 1) * limit;

    console.log('Search API called with:', { query, page, startIndex, limit });

    if (!query) {
      console.log('No query parameter provided');
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&startIndex=${startIndex}&maxResults=${limit}`;
    
    console.log('Fetching from Google Books API:', googleBooksUrl);
    
    const response = await fetch(googleBooksUrl);

    if (!response.ok) {
      console.error('Google Books API error:', response.status, response.statusText);
      throw new Error('Failed to fetch from Google Books API');
    }

    const data = await response.json();
    console.log('Google Books API response:', {
      totalItems: data.totalItems,
      itemsReceived: data.items?.length || 0
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in books search:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}