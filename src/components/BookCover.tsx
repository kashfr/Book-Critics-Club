'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  /** Custom cover URL from Firebase Storage (highest priority) */
  customCoverUrl?: string | null;
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

/**
 * BookCover component that displays a book cover image with automatic fallback.
 * 
 * Priority order:
 * 1. Custom cover (user uploaded, from Firebase Storage)
 * 2. Google Books thumbnail (fast, usually available)
 * 3. Server Proxy (tries B&N/Amazon/OpenLibrary)
 * 4. Generic book icon
 */
export default function BookCover({
  customCoverUrl,
  googleThumbnail,
  title,
  author,
  isbn,
  alt,
  className = '',
  sizes = '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw',
  priority = false,
}: BookCoverProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fallbackStage, setFallbackStage] = useState<'custom' | 'google' | 'proxy' | 'none'>('custom');

  useEffect(() => {
    // Priority: Custom cover > Google thumbnail > Proxy
    if (customCoverUrl) {
      setImageUrl(customCoverUrl);
      setFallbackStage('custom');
    } else if (googleThumbnail) {
      setImageUrl(googleThumbnail.replace('zoom=1', 'zoom=2'));
      setFallbackStage('google');
    } else if (isbn) {
      setImageUrl(`/api/books/cover?isbn=${encodeURIComponent(isbn)}`);
      setFallbackStage('proxy');
    } else {
      setFallbackStage('none');
    }
  }, [customCoverUrl, googleThumbnail, isbn]);

  const triggerFallback = () => {
    if (fallbackStage === 'custom' && googleThumbnail) {
      console.log('Custom cover failed, trying Google...');
      setImageUrl(googleThumbnail.replace('zoom=1', 'zoom=2'));
      setFallbackStage('google');
    } else if (fallbackStage === 'custom' && isbn) {
      console.log('Custom cover failed, trying proxy...');
      setImageUrl(`/api/books/cover?isbn=${encodeURIComponent(isbn)}`);
      setFallbackStage('proxy');
    } else if (fallbackStage === 'google' && isbn) {
      console.log('Google thumbnail failed, trying proxy...');
      setImageUrl(`/api/books/cover?isbn=${encodeURIComponent(isbn)}`);
      setFallbackStage('proxy');
    } else {
      setFallbackStage('none');
    }
  };

  const handleError = () => {
    console.log(`Image load error at stage: ${fallbackStage}`);
    triggerFallback();
  };

  // Detect placeholder images that load successfully but are blank/tiny
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    
    // Google's placeholder images are typically very small (1x1 or similar)
    // Real book covers should be at least 50x75 pixels
    if (fallbackStage === 'google' && (img.naturalWidth < 50 || img.naturalHeight < 50)) {
      console.log(`Detected placeholder image (${img.naturalWidth}x${img.naturalHeight}), trying fallback...`);
      triggerFallback();
    }
  };

  // Show book icon if no valid image
  if (fallbackStage === 'none' || !imageUrl) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        <BookOpen className="w-12 h-12" />
      </div>
    );
  }

  const isProxyUrl = imageUrl.startsWith('/api/');
  const isFirebaseUrl = imageUrl.includes('storage.googleapis.com') || imageUrl.includes('firebasestorage.googleapis.com');

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      className={`object-cover group-hover:scale-105 transition-transform duration-300 ${className}`}
      sizes={sizes}
      priority={priority}
      onError={handleError}
      onLoad={handleLoad}
      unoptimized={isProxyUrl || isFirebaseUrl}
    />
  );
}
