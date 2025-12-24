import { NextResponse } from "next/server";

/**
 * Server-side cover proxy API
 * Fetches book covers from external sources that block direct browser requests
 * This bypasses CORS and hotlink protection issues
 */

const COVER_SOURCES = [
  // Barnes & Noble
  (isbn: string) => `https://prodimage.images-bn.com/pimages/${isbn}_p0_v1_s600x595.jpg`,
  // Amazon legacy (sometimes works)
  (isbn: string) => `https://images-na.ssl-images-amazon.com/images/P/${isbn}.01._SCLZZZZZZZ_.jpg`,
  // Open Library (as backup)
  (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
];

// Timeout for each fetch attempt (5 seconds)
const FETCH_TIMEOUT_MS = 5000;

async function tryFetchCover(url: string): Promise<Response | null> {
  // Create an AbortController with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Cover fetch failed for ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    // Check if it's a valid image (not a placeholder or error page)
    if (!contentType?.startsWith('image/')) {
      console.log(`Not an image: ${url} (${contentType})`);
      return null;
    }

    // Open Library returns a tiny image for missing covers
    if (contentLength && parseInt(contentLength) < 1000) {
      console.log(`Image too small (placeholder): ${url} (${contentLength} bytes)`);
      return null;
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`Timeout fetching cover from ${url}`);
    } else {
      console.error(`Error fetching cover from ${url}:`, error);
    }
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get('isbn');
  const title = searchParams.get('title');

  if (!isbn && !title) {
    return NextResponse.json({ error: 'ISBN or title required' }, { status: 400 });
  }

  // Try ISBN-based sources first
  if (isbn) {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    for (const getUrl of COVER_SOURCES) {
      const url = getUrl(cleanISBN);
      console.log(`Trying cover source: ${url}`);
      
      const response = await tryFetchCover(url);
      if (response) {
        // Stream the image back to the client
        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          },
        });
      }
    }
  }

  // If ISBN sources failed, return 404
  return NextResponse.json({ error: 'Cover not found' }, { status: 404 });
}
