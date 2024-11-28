   // src/types/books.ts
   export interface Book {
    id: string;
    googleBooksId: string;
    chapters: number;
    volumeInfo: {
      title: string;
      subtitle?: string;
      authors?: string[];
      description?: string;
      imageLinks?: {
        thumbnail: string;
      };
      publisher?: string;
      publishedDate?: string;
      pageCount?: number;
      categories?: string[];
      averageRating?: number;
      ratingsCount?: number;
      previewLink?: string;
      language?: string;
      infoLink?: string;
      canonicalVolumeLink?: string;
      maturityRating?: string;
      industryIdentifiers?: Array<{
        type: string;
        identifier: string;
      }>;
    };
    saleInfo?: {
      listPrice?: {
        amount: number;
        currencyCode: string;
      };
      retailPrice?: {
        amount: number;
        currencyCode: string;
      };
      buyLink?: string;
    };
  }

  export interface SearchResponse {
    items?: Book[];
    totalItems?: number;
  }