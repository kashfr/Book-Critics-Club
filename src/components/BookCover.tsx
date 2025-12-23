'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { getOpenLibraryCover } from '@/utils/bookCoverFallback';

interface BookCoverProps {
  /** Google Books thumbnail URL */
  googleThumbnail?: string;
  /** Book title for fallback search */
  title: string;
  /** Author name for fallback search */
  author?: string;
  /** ISBN for direct cover lookup */
  isbn?: string;
  /** Alt text for the image */
  alt: string;
  /** Additional CSS classes */
  className?: string;
  /** Image sizes for responsive loading */
  sizes?: string;
  /** Whether to prioritize loading this image */
  priority?: boolean;
}

type CoverState = 'loading' | 'google' | 'fallback' | 'none';

/**
 * BookCover component that displays a book cover image with automatic fallback.
 * 1. First tries Google Books thumbnail
 * 2. If not available, fetches from Open Library
 * 3. Falls back to a book icon if no cover found
 */
export default function BookCover({
  googleThumbnail,
  title,
  author,
  isbn,
  alt,
  className = '',
  sizes = '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw',
  priority = false,
}: BookCoverProps) {
  const [coverState, setCoverState] = useState<CoverState>(
    googleThumbnail ? 'google' : 'loading'
  );
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    // If we already have a Google thumbnail, no need to fetch fallback
    if (googleThumbnail) {
      setCoverState('google');
      return;
    }

    // Fetch fallback cover from Open Library
    let cancelled = false;
    
    async function fetchFallback() {
      try {
        const url = await getOpenLibraryCover({ isbn, title, author });
        if (!cancelled) {
          if (url) {
            setFallbackUrl(url);
            setCoverState('fallback');
          } else {
            setCoverState('none');
          }
        }
      } catch (error) {
        console.error('Error fetching fallback cover:', error);
        if (!cancelled) {
          setCoverState('none');
        }
      }
    }

    fetchFallback();

    return () => {
      cancelled = true;
    };
  }, [googleThumbnail, isbn, title, author]);

  // Loading state - show subtle placeholder
  if (coverState === 'loading') {
    return (
      <div className={`flex items-center justify-center h-full bg-muted/20 animate-pulse ${className}`}>
        <BookOpen className="w-8 h-8 text-muted-foreground/50" />
      </div>
    );
  }

  // No cover found - show book icon
  if (coverState === 'none') {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        <BookOpen className="w-12 h-12" />
      </div>
    );
  }

  // Determine which URL to use
  const imageUrl = coverState === 'google' 
    ? googleThumbnail!.replace('zoom=1', 'zoom=2')
    : fallbackUrl!;

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      className={`object-cover group-hover:scale-105 transition-transform duration-300 ${className}`}
      sizes={sizes}
      priority={priority}
      onError={() => {
        // If image fails to load, try fallback or show icon
        if (coverState === 'google' && !fallbackUrl) {
          // Google image failed, try Open Library
          setCoverState('loading');
          getOpenLibraryCover({ isbn, title, author }).then((url) => {
            if (url) {
              setFallbackUrl(url);
              setCoverState('fallback');
            } else {
              setCoverState('none');
            }
          });
        } else {
          setCoverState('none');
        }
      }}
    />
  );
}
