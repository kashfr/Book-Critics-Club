import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Get user ID from request headers (set by auth middleware or client)
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 401 }
      );
    }

    const bookDetailsRef = collection(db, "bookDetails");
    
    // Try querying by array first (new standard)
    const arrayQuery = query(bookDetailsRef, where("contributorIds", "array-contains", userId));
    const arraySnapshot = await getDocs(arrayQuery);
    
    const docs = [...arraySnapshot.docs];
    const existingIds = new Set(docs.map(d => d.id));
    
    // Also check legacy field (for backward compatibility)
    const legacyQuery = query(bookDetailsRef, where("contributorId", "==", userId));
    const legacySnapshot = await getDocs(legacyQuery);
    
    legacySnapshot.docs.forEach(d => {
      if (!existingIds.has(d.id)) {
        docs.push(d);
        existingIds.add(d.id);
      }
    });

    // ALSO check for approved proposals where the user is the proposer
    // This handles the case where proposals were approved before the contributorIds field was added
    const proposalsRef = collection(db, "chapterProposals");
    const approvedProposalsQuery = query(
      proposalsRef,
      where("proposerId", "==", userId),
      where("status", "==", "approved")
    );
    const approvedSnapshot = await getDocs(approvedProposalsQuery);

    // For each approved proposal, add the book if not already in the list
    for (const proposalDoc of approvedSnapshot.docs) {
      const proposalData = proposalDoc.data();
      if (!existingIds.has(proposalData.bookId)) {
        existingIds.add(proposalData.bookId);
        
        // Fetch the current bookDetails for this book to get latest chapter count
        const bookDocRef = doc(db, "bookDetails", proposalData.bookId);
        const bookDocSnap = await getDoc(bookDocRef);
        
        if (bookDocSnap.exists()) {
          const bookData = bookDocSnap.data();
          docs.push({
            id: bookDocSnap.id,
            data: () => bookData,
          } as any);
        } else {
          // Book details might not exist anymore, use proposal data
          docs.push({
            id: proposalData.bookId,
            data: () => ({
              chapters: proposalData.proposedChapters,
              contributedAt: proposalData.resolvedAt || proposalData.createdAt,
              upvotes: 0,
              downvotes: 0,
            }),
          } as any);
        }
      }
    }

    const contributions = docs
      .map((d) => ({
        bookId: d.id,
        chapters: d.data().chapters,
        contributedAt: d.data().contributedAt,
        upvotes: d.data().upvotes || 0,
        downvotes: d.data().downvotes || 0,
      }))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.contributedAt).getTime();
        const dateB = new Date(b.contributedAt).getTime();
        return dateB - dateA;
      });

    return NextResponse.json({ contributions });
  } catch (error) {
    console.error("GET contributions - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
      
    if (
      errorMessage.includes("permission") ||
      errorMessage.includes("Missing or insufficient permissions")
    ) {
      return NextResponse.json({ contributions: [] });
    }

    return NextResponse.json(
      { error: `Failed to fetch contributions: ${errorMessage}` },
      { status: 500 }
    );
  }
}
