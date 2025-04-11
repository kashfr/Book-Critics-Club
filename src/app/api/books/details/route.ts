import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore"; // Correct import for Firestore Admin SDK
import { initializeFirebaseAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

// Firestore collection name
const BOOK_DETAILS_COLLECTION = "bookDetails";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id"); // This is the Google Books ID

    if (!id) {
      console.error("Book details API: Missing ID parameter");
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    console.log("Fetching book details for Google Books ID:", id);

    // Fetch from Google Books API
    const googleBooksResponse = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${id}`
    );

    if (!googleBooksResponse.ok) {
      console.error("Google Books API error:", {
        status: googleBooksResponse.status,
        statusText: googleBooksResponse.statusText,
      });
      throw new Error(
        `Google Books API error: ${googleBooksResponse.status} ${googleBooksResponse.statusText}`
      );
    }

    const googleBooksData = await googleBooksResponse.json();
    console.log("Successfully fetched from Google Books API");

    // Fetch chapter count from Firestore
    let chapters = 0; // Default to 0 chapters
    try {
      const firestore = getFirestore();
      // Use Admin SDK pattern
      const docRef = firestore.collection(BOOK_DETAILS_COLLECTION).doc(id);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        // Correct usage: boolean property
        const firestoreData = docSnap.data();
        if (firestoreData && typeof firestoreData.chapters === "number") {
          chapters = firestoreData.chapters;
        }
        console.log("Fetched chapter count from Firestore:", chapters);
      } else {
        console.log(
          "No chapter count found in Firestore for this book, defaulting to 0."
        );
      }
    } catch (firestoreError) {
      console.error("Firestore error fetching chapters:", firestoreError);
      // Proceed with default chapters = 0 if Firestore fails
    }

    // Combine data
    const combinedData = {
      ...googleBooksData,
      googleBooksId: id, // Ensure this ID is included
      chapters: chapters, // Include chapters fetched from Firestore (or default)
    };

    return NextResponse.json(combinedData);
  } catch (error) {
    console.error("GET - Error fetching book details:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch book details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
