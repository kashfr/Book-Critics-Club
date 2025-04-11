import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

// Firestore collection name for book details
const BOOK_DETAILS_COLLECTION = "bookDetails";

export const dynamic = "force-dynamic";

async function getBookChaptersFromFirestore(
  bookId: string
): Promise<number | null> {
  const firestore = getFirestore();
  const docRef = firestore.collection(BOOK_DETAILS_COLLECTION).doc(bookId);
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    const data = docSnap.data();
    return data && typeof data.chapters === "number" ? data.chapters : 0;
  } else {
    return null;
  }
}

async function setBookChaptersInFirestore(
  bookId: string,
  chapters: number
): Promise<void> {
  const firestore = getFirestore();
  const docRef = firestore.collection(BOOK_DETAILS_COLLECTION).doc(bookId);
  await docRef.set({ chapters: chapters }, { merge: true });
}

export async function GET(request: Request) {
  console.log("Starting GET request for chapters");
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    console.log("GET chapters - Received request for bookId:", bookId);

    if (!bookId) {
      console.error("GET chapters - Missing bookId parameter");
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    const chapters = await getBookChaptersFromFirestore(bookId);

    if (chapters === null) {
      console.log(
        "GET chapters - Book not found, creating new entry with 0 chapters"
      );
      await setBookChaptersInFirestore(bookId, 0);
      return NextResponse.json({ chapters: 0 });
    } else {
      console.log("GET chapters - Found chapters:", chapters);
      return NextResponse.json({ chapters: chapters });
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

    await setBookChaptersInFirestore(bookId, chapters);

    console.log("POST chapters - Updated book chapters for bookId:", bookId);
    return NextResponse.json({ bookId, chapters });
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
