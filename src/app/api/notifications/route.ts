import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper to get Firestore dynamically
async function getFirestoreAdmin() {
  const { getFirestore } = await import("@/lib/firebase/admin");
  return getFirestore();
}

// GET: Fetch notifications for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limitCount = parseInt(searchParams.get("limit") || "20", 10);

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const firestore = await getFirestoreAdmin();
    const notificationsRef = firestore.collection(`users/${userId}/notifications`);
    
    let queryFn = notificationsRef.limit(limitCount);

    if (unreadOnly) {
      queryFn = notificationsRef.where("read", "==", false).limit(limitCount);
    }

    // Admin SDK doesn't support complex sorting without indexes easily if we want to avoid errors.
    // So we fetch and sort in memory, same as contributions.
    const snapshot = await queryFn.get();
    
    const notifications = snapshot.docs
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || "",
      }))
      .sort((a: any, b: any) => {
        // Sort by createdAt descending (newest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

    // Calculate unread count
    const unreadSnapshot = await notificationsRef.where("read", "==", false).get();
    const unreadCount = unreadSnapshot.size;

    return NextResponse.json({ 
      notifications,
      unreadCount 
    });
  } catch (error) {
    console.error("GET notifications - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    // If Firebase Admin fails to initialize (likely missing env vars or dependency crash), return empty list
    if (
      errorMessage.includes("Failed to initialize Firebase Admin") || 
      errorMessage.includes("FIREBASE_SERVICE_ACCOUNT_KEY is not defined") ||
      errorMessage.includes("Cannot read properties of undefined")
    ) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    return NextResponse.json(
      { error: `Failed to fetch notifications: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// POST: Create a notification
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetUserId, type, title, message, relatedBookId, relatedProposalId } = body;

    if (!targetUserId || !type || !title || !message) {
      return NextResponse.json(
        { error: "targetUserId, type, title, and message are required" },
        { status: 400 }
      );
    }

    const notificationData = {
      type,
      title,
      message,
      relatedBookId: relatedBookId || null,
      relatedProposalId: relatedProposalId || null,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const firestore = await getFirestoreAdmin();
    const docRef = await firestore.collection(`users/${targetUserId}/notifications`).add(notificationData);

    console.log("POST notifications - Created notification:", docRef.id);

    return NextResponse.json({
      success: true,
      notificationId: docRef.id,
    });
  } catch (error) {
    console.error("POST notifications - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: `Failed to create notification: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, notificationId, markAllRead } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }
    
    const firestore = await getFirestoreAdmin();
    const notificationsRef = firestore.collection(`users/${userId}/notifications`);

    if (markAllRead) {
      const unreadSnapshot = await notificationsRef.where("read", "==", false).get();
      const batch = firestore.batch();
      
      unreadSnapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        markedRead: unreadSnapshot.size,
      });
    } else if (notificationId) {
      await notificationsRef.doc(notificationId).update({ read: true });

      return NextResponse.json({
        success: true,
        markedRead: 1,
      });
    } else {
      return NextResponse.json(
        { error: "Either notificationId or markAllRead is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("PATCH notifications - Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: `Failed to update notifications: ${errorMessage}` },
      { status: 500 }
    );
  }
}
