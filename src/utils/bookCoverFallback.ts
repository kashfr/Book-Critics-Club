/**
 * Utility functions for fetching fallback book covers from Open Library
 * when Google Books API doesn't provide a thumbnail.
 */

const OPEN_LIBRARY_COVERS_BASE = 'https://covers.openlibrary.org/b';
const OPEN_LIBRARY_SEARCH_API = 'https://openlibrary.org/search.json';

/**
 * Get a book cover URL from Open Library using ISBN
 * @param isbn - ISBN-10 or ISBN-13
 * @param size - 'S' (small), 'M' (medium), or 'L' (large)
 * @returns Cover URL
 */
export function getOpenLibraryCoverByISBN(
  isbn: string,
  size: 'S' | 'M' | 'L' = 'L'
): string {
  // Clean the ISBN (remove hyphens and spaces)
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  return `${OPEN_LIBRARY_COVERS_BASE}/isbn/${cleanISBN}-${size}.jpg`;
}

/**
 * Check if an image URL is valid (returns actual image content)
 * @param url - Image URL to check
 * @returns true if image exists and is valid
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;
    
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    // Open Library returns a 1x1 pixel transparent GIF for missing covers
    // This is typically 43 bytes, so we check for reasonable image size
    if (contentLength && parseInt(contentLength) < 100) {
      return false;
    }
    
    return contentType?.startsWith('image/') ?? false;
  } catch {
    return false;
  }
}

/**
 * Search Open Library for a book cover by title and author
 * @param title - Book title
 * @param author - Author name (optional but improves accuracy)
 * @returns Cover URL or null if not found
 */
export async function searchOpenLibraryCover(
  title: string,
  author?: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title: title,
      limit: '1',
      fields: 'cover_i,isbn',
    });
    
    if (author) {
      params.append('author', author);
    }
    
    const response = await fetch(`${OPEN_LIBRARY_SEARCH_API}?${params}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.docs && data.docs.length > 0) {
      const book = data.docs[0];
      
      // Try cover_i first (Open Library internal cover ID)
      if (book.cover_i) {
        return `${OPEN_LIBRARY_COVERS_BASE}/id/${book.cover_i}-L.jpg`;
      }
      
      // Fall back to ISBN if available
      if (book.isbn && book.isbn.length > 0) {
        return getOpenLibraryCoverByISBN(book.isbn[0]);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching Open Library:', error);
    return null;
  }
}

/**
 * Get a Barnes & Noble cover URL using ISBN
 * Note: strict bot protection, client-side only
 */
export function getBarnesAndNobleCover(isbn: string): string {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  return `https://prodimage.images-bn.com/pimages/${cleanISBN}_p0_v1_s600x595.jpg`;
}

/**
 * Get an Amazon cover URL using ISBN
 * Note: legacy API, may be flaky
 */
export function getAmazonCover(isbn: string): string {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  return `https://images-na.ssl-images-amazon.com/images/P/${cleanISBN}.01._SCLZZZZZZZ_.jpg`;
}

/**
 * Get a fallback book cover URL from Open Library
 * Tries ISBN first, then falls back to title/author search
 * @param options - Book information for lookup
 * @returns Cover URL or null if no cover found
 */
export async function getOpenLibraryCover(options: {
  isbn?: string;
  title?: string;
  author?: string;
}): Promise<string | null> {
  const { isbn, title, author } = options;
  
  // Try ISBN-based lookup first (faster and more accurate)
  if (isbn) {
    const isbnUrl = getOpenLibraryCoverByISBN(isbn);
    if (await isValidImageUrl(isbnUrl)) {
      return isbnUrl;
    }
  }
  
  // Fall back to title/author search
  if (title) {
    return searchOpenLibraryCover(title, author);
  }
  
  return null;
}
