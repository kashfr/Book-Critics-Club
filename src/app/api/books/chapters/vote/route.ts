import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const BOOK_DETAILS_COLLECTION = "bookDetails";

export const dynamic = "force-dynamic";

// Helper to get Firestore Admin (with error handling for Node.js compatibility issues)
async function getFirestoreAdmin() {
  try {
    const { getFirestore } = await import("@/lib/firebase/admin");
    return getFirestore();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, userId, userName, vote } = body;

    console.log("POST vote - Received:", { bookId, userId, vote });

    if (!bookId || !userId || !vote) {
      return NextResponse.json(
        { error: "bookId, userId, and vote are required" },
        { status: 400 }
      );
    }

    if (vote !== "up" && vote !== "down") {
      return NextResponse.json(
        { error: "vote must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    // Try Admin SDK first, fall back to Client SDK if not available
    const adminDb = await getFirestoreAdmin();
    
    let data: any;
    let updateFn: () => Promise<void>;
    
    if (adminDb) {
      // Use Admin SDK (bypasses security rules)
      console.log("POST vote - Using Admin SDK");
      const docRef = adminDb.collection(BOOK_DETAILS_COLLECTION).doc(bookId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return NextResponse.json(
          { error: "Book details not found" },
          { status: 404 }
        );
      }
      data = docSnap.data() || {};
      
      updateFn = async () => {
        const voters = (data.voters || {}) as Record<string, string>;
        let upvotes = typeof data.upvotes === "number" ? data.upvotes : 0;
        let downvotes = typeof data.downvotes === "number" ? data.downvotes : 0;
        const previousVote = voters[userId] as string | undefined;

        if (previousVote === "up") upvotes = Math.max(0, upvotes - 1);
        else if (previousVote === "down") downvotes = Math.max(0, downvotes - 1);

        if (previousVote === vote) {
          delete voters[userId];
        } else {
          voters[userId] = vote;
          if (vote === "up") upvotes++;
          else downvotes++;
        }

        await docRef.update({ upvotes, downvotes, voters });
        data = { ...data, upvotes, downvotes, voters };
      };
    } else {
      // Fallback to Client SDK
      console.log("POST vote - Falling back to Client SDK");
      const clientDocRef = doc(db, BOOK_DETAILS_COLLECTION, bookId);
      const docSnap = await getDoc(clientDocRef);

      if (!docSnap.exists()) {
        return NextResponse.json(
          { error: "Book details not found" },
          { status: 404 }
        );
      }
      data = docSnap.data() || {};
      
      updateFn = async () => {
        const voters = (data.voters || {}) as Record<string, string>;
        let upvotes = typeof data.upvotes === "number" ? data.upvotes : 0;
        let downvotes = typeof data.downvotes === "number" ? data.downvotes : 0;
        const previousVote = voters[userId] as string | undefined;

        if (previousVote === "up") upvotes = Math.max(0, upvotes - 1);
        else if (previousVote === "down") downvotes = Math.max(0, downvotes - 1);

        if (previousVote === vote) {
          delete voters[userId];
        } else {
          voters[userId] = vote;
          if (vote === "up") upvotes++;
          else downvotes++;
        }

        await updateDoc(clientDocRef, { upvotes, downvotes, voters });
        data = { ...data, upvotes, downvotes, voters };
      };
    }

    // Execute the update
    await updateFn();

    const userVote = data.voters?.[userId] || null;

    console.log("POST vote - Updated successfully:", {
      upvotes: data.upvotes,
      downvotes: data.downvotes,
      userVote,
    });

    return NextResponse.json({
      success: true,
      upvotes: data.upvotes,
      downvotes: data.downvotes,
      userVote,
    });
  } catch (error) {
    console.error("POST vote - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    
    // Handle dependency crash or permission errors gracefully
    if (
      errorMessage.includes("Cannot read properties of undefined") ||
      errorMessage.includes("PERMISSION_DENIED") ||
      errorMessage.includes("Missing or insufficient permissions")
    ) {
      return NextResponse.json(
        { error: "Unable to record vote. Please try again later." },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to record vote: ${errorMessage}` },
      { status: 500 }
    );
  }
}
