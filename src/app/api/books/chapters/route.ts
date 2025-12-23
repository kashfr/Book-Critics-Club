import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Firestore collection name for book details
const BOOK_DETAILS_COLLECTION = "bookDetails";

export const dynamic = "force-dynamic";

// For server-side Firestore operations with Admin SDK (used for writes)
async function getFirestoreAdmin() {
  try {
    const { getFirestore } = await import("@/lib/firebase/admin");
    return getFirestore();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

// Helper to extract chapter details from document data
function extractChapterDetails(data: Record<string, unknown> | undefined) {
  if (!data) {
    return {
      chapters: 0,
      contributorId: null,
      contributorName: null,
      contributedAt: null,
      upvotes: 0,
      downvotes: 0,
      voters: {},
      userVote: null as string | null,
    };
  }

  return {
    chapters: typeof data.chapters === "number" ? data.chapters : 0,
    contributorId: data.contributorId || null,
    contributorName: data.contributorName || null,
    contributedAt: data.contributedAt || null,
    upvotes: typeof data.upvotes === "number" ? data.upvotes : 0,
    downvotes: typeof data.downvotes === "number" ? data.downvotes : 0,
    voters: data.voters || {},
    userVote: null as string | null,
  };
}

export async function GET(request: Request) {
  console.log("Starting GET request for chapters");
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const userId = searchParams.get("userId"); // Optional: to determine user's vote

    console.log("GET chapters - Received request for bookId:", bookId);

    if (!bookId) {
      console.error("GET chapters - Missing bookId parameter");
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    // Try to use Admin SDK first
    const adminDb = await getFirestoreAdmin();

    if (adminDb) {
      // Use Admin SDK which bypasses security rules
      const docRef = adminDb.collection(BOOK_DETAILS_COLLECTION).doc(bookId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();
        const details = extractChapterDetails(data);
        // Add user's vote if userId provided
        if (userId && details.voters && typeof details.voters === 'object') {
          const voters = details.voters as Record<string, string>;
          details.userVote = voters[userId] || null;
        }
        console.log("GET chapters - Found chapters (admin):", details.chapters);
        return NextResponse.json(details);
      } else {
        console.log("GET chapters - Book not found, returning defaults");
        return NextResponse.json(extractChapterDetails(undefined));
      }
    } else {
      // Fallback: Use client SDK (will work for public reads due to Firestore rules)
      console.log("GET chapters - Using client SDK fallback");
      const docRef = doc(db, BOOK_DETAILS_COLLECTION, bookId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const details = extractChapterDetails(data);
        if (userId && details.voters && typeof details.voters === 'object') {
          const voters = details.voters as Record<string, string>;
          details.userVote = voters[userId] || null;
        }
        console.log("GET chapters - Found chapters (client):", details.chapters);
        return NextResponse.json(details);
      } else {
        console.log("GET chapters - Book not found, returning defaults");
        return NextResponse.json(extractChapterDetails(undefined));
      }
    }
  } catch (error: unknown) {
    console.error("GET chapters - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: `Failed to retrieve chapters: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log("Starting POST request for chapters");
  try {
    const body = await request.json();
    const { bookId, chapters } = body;

    console.log("POST chapters - Received request:", { bookId, chapters });

    if (!bookId || typeof chapters !== "number") {
      console.error("POST chapters - Invalid input:", { bookId, chapters });
      return NextResponse.json(
        { error: "Book ID and a valid chapter number are required" },
        { status: 400 }
      );
    }

    // Try to use Admin SDK for writes
    const adminDb = await getFirestoreAdmin();

    if (adminDb) {
      const docRef = adminDb.collection(BOOK_DETAILS_COLLECTION).doc(bookId);
      await docRef.set({ chapters }, { merge: true });
      console.log("POST chapters - Updated book chapters for bookId:", bookId);
      return NextResponse.json({ bookId, chapters });
    } else {
      // Fallback: try with client SDK (requires proper auth from client)
      console.log("POST chapters - Attempting client SDK fallback");
      const docRef = doc(db, BOOK_DETAILS_COLLECTION, bookId);
      await setDoc(docRef, { chapters }, { merge: true });
      console.log(
        "POST chapters - Updated book chapters for bookId (client):",
        bookId
      );
      return NextResponse.json({ bookId, chapters });
    }
  } catch (error: unknown) {
    console.error("POST chapters - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: `Failed to update chapters: ${errorMessage}` },
      { status: 500 }
    );
  }
}
