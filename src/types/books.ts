// src/types/books.ts
export interface Book {
  id: string;
  customCoverUrl?: string; // Optional field for user-uploaded covers
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail: string;
      smallThumbnail: string;
    };
    publishedDate?: string;
    publisher?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    previewLink?: string;
    language?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
    industryIdentifiers?: Array<{
      type: string; // "ISBN_10", "ISBN_13", "OTHER"
      identifier: string;
    }>;
  };
}

export interface SearchResponse {
  items: Book[];
  totalItems: number;
  kind: string;
}