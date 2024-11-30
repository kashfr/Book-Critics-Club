   // src/types/books.ts
   export interface Book {
    id: string;
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
    };
  }

  export interface SearchResponse {
    items: Book[];
    totalItems: number;
    kind: string;
  }