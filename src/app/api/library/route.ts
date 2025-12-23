import { NextResponse } from "next/server";
import { auth as adminAuth } from "@/lib/firebase/admin-init";
import { SavedBook } from "@/types/savedBooks";

export const dynamic = "force-dynamic";

// Helper to get Firestore dynamically
async function getFirestoreAdmin() {
  const { getFirestore } = await import("@/lib/firebase/admin");
  return getFirestore();
}

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    try {
      if (!adminAuth) {
        console.error("Firebase Admin SDK not initialized.");
        return null;
      }
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      return decodedToken.uid;
    } catch (error) {
      console.error("Error verifying Firebase ID token:", error);
      return null;
    }
  }
  return null;
}

// GET: Fetch all saved books for the authenticated user, or check a specific book
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    const firestore = await getFirestoreAdmin();
    const savedBooksRef = firestore
      .collection("users")
      .doc(userId)
      .collection("savedBooks");

    if (bookId) {
      const doc = await savedBooksRef.doc(bookId).get();
      return NextResponse.json({ isSaved: doc.exists });
    }

    const snapshot = await savedBooksRef.orderBy("savedAt", "desc").get();

    const savedBooks: SavedBook[] = snapshot.docs.map((doc) => ({
      bookId: doc.id,
      ...doc.data(),
    })) as SavedBook[];

    return NextResponse.json({ savedBooks });
  } catch (error) {
    console.error("GET /api/library - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch library";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST: Add a book to the user's library
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookId, title, authors, thumbnail } = body;

    if (!bookId || !title) {
      return NextResponse.json(
        { error: "bookId and title are required" },
        { status: 400 }
      );
    }

    const firestore = await getFirestoreAdmin();
    const bookDocRef = firestore
      .collection("users")
      .doc(userId)
      .collection("savedBooks")
      .doc(bookId);

    const savedBook: SavedBook = {
      bookId,
      title,
      authors: authors || [],
      thumbnail: thumbnail || undefined,
      savedAt: new Date().toISOString(),
    };

    await bookDocRef.set(savedBook);

    return NextResponse.json({ message: "Book saved successfully", savedBook });
  } catch (error) {
    console.error("POST /api/library - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save book";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE: Remove a book from the user's library
export async function DELETE(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return NextResponse.json(
        { error: "bookId is required" },
        { status: 400 }
      );
    }

    const firestore = await getFirestoreAdmin();
    const bookDocRef = firestore
      .collection("users")
      .doc(userId)
      .collection("savedBooks")
      .doc(bookId);

    await bookDocRef.delete();

    return NextResponse.json({ message: "Book removed from library" });
  } catch (error) {
    console.error("DELETE /api/library - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to remove book";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
