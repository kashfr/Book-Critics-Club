// src/types/savedBooks.ts

export interface SavedBook {
  bookId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  savedAt: string; // ISO date string
}
