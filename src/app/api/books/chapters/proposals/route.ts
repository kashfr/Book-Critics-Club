import { NextResponse } from "next/server";

const PROPOSALS_COLLECTION = "chapterProposals";
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

// GET: Fetch proposals for a book or all pending proposals
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const status = searchParams.get("status") || "pending";

    const firestore = await getFirestoreAdmin();
    
    if (!firestore) {
      return NextResponse.json(
        { error: "Firebase Admin not available" },
        { status: 500 }
      );
    }

    const proposalsRef = firestore.collection(PROPOSALS_COLLECTION);
    let queryRef;

    if (bookId) {
      queryRef = proposalsRef
        .where("bookId", "==", bookId)
        .where("status", "==", status);
    } else {
      queryRef = proposalsRef.where("status", "==", status);
    }

    const snapshot = await queryRef.get();
    
    // Sort in-memory by createdAt descending
    const proposals = snapshot.docs
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error("GET proposals - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    
    // Handle dependency crash errors gracefully
    if (errorMessage.includes("Cannot read properties of undefined")) {
      return NextResponse.json({ proposals: [] });
    }
    
    return NextResponse.json(
      { error: `Failed to fetch proposals: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// POST: Create a new proposal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bookId,
      bookTitle,
      proposedChapters,
      proposerId,
      proposerName,
      reason,
    } = body;

    if (!bookId || !proposedChapters || !proposerId || !reason) {
      return NextResponse.json(
        {
          error:
            "bookId, proposedChapters, proposerId, and reason are required",
        },
        { status: 400 }
      );
    }

    const firestore = await getFirestoreAdmin();
    
    if (!firestore) {
      return NextResponse.json(
        { error: "Firebase Admin not available" },
        { status: 500 }
      );
    }

    // Get current book details to store current chapters and original contributor
    const bookDocRef = firestore.collection(BOOK_DETAILS_COLLECTION).doc(bookId);
    const bookDocSnap = await bookDocRef.get();

    let currentChapters = 0;
    let originalContributorId = null;
    let originalContributorName = null;

    if (bookDocSnap.exists) {
      const data = bookDocSnap.data() || {};
      currentChapters = data.chapters || 0;
      originalContributorId = data.contributorId || null;
      originalContributorName = data.contributorName || null;
    }

    // Create the proposal
    const proposalData = {
      bookId,
      bookTitle: bookTitle || "Unknown Book",
      proposedChapters,
      currentChapters,
      proposerId,
      proposerName: proposerName || "Anonymous",
      originalContributorId,
      originalContributorName,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
      votes: {},
      supportCount: 0,
      opposeCount: 0,
    };

    const proposalsRef = firestore.collection(PROPOSALS_COLLECTION);
    const docRef = await proposalsRef.add(proposalData);

    console.log("POST proposals - Created proposal:", docRef.id);

    // Create notification for original contributor if they exist
    if (originalContributorId && originalContributorId !== proposerId) {
      try {
        await fetch(new URL('/api/notifications', request.url).origin + '/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: originalContributorId,
            type: 'proposal_dispute',
            title: 'Your chapter count was disputed',
            message: `${proposerName || 'Someone'} proposed changing the chapter count for "${bookTitle}" from ${currentChapters} to ${proposedChapters}.`,
            relatedBookId: bookId,
            relatedProposalId: docRef.id,
          }),
        });
      } catch (notifyError) {
        console.error("Failed to create notification:", notifyError);
        // Don't fail the proposal creation if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      proposalId: docRef.id,
      proposal: { id: docRef.id, ...proposalData },
    });
  } catch (error) {
    console.error("POST proposals - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    
    // Handle dependency crash errors gracefully
    if (errorMessage.includes("Cannot read properties of undefined")) {
      return NextResponse.json(
        { error: "Server configuration issue. Please try again later." },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to create proposal: ${errorMessage}` },
      { status: 500 }
    );
  }
}
