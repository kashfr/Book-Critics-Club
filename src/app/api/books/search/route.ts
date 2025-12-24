import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { initializeFirebaseAdmin, getFirestore } = await import("@/lib/firebase/admin");
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
    
    // Enrich with custom covers from Firestore
    if (data.items && data.items.length > 0) {
      try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const ids = data.items.map((item: any) => item.id);
        
        // Firestore 'in' query supports up to 30 items. 
        // Google returns 40 by default, so we might need to batch or just get all for now if small enough.
        // Actually, let's just do individual reads in parallel for simplicity given the scale (<40)
        // or batch them if we want to be fancy. 'getAll' is good.
        
        const refs = ids.map((id: string) => db.collection('bookCovers').doc(id));
        const snapshots = await db.getAll(...refs);
        
        const coverMap = new Map();
        snapshots.forEach((snap) => {
          if (snap.exists) {
            const docData = snap.data();
            if (docData?.coverUrl) {
              coverMap.set(snap.id, docData.coverUrl);
            }
          }
        });

        // Merge back into items
        data.items = data.items.map((item: any) => {
          if (coverMap.has(item.id)) {
            return {
              ...item,
              customCoverUrl: coverMap.get(item.id)
            };
          }
          return item;
        });

      } catch (firestoreError) {
        console.error('Error fetching custom covers:', firestoreError);
        // Continue without custom covers on error
      }
    }

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