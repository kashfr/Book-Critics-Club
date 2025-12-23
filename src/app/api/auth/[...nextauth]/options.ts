import type {
  NextAuthOptions,
  Session as NextAuthSession,
  User as NextAuthUser,
} from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/auth-utils";

// Note: Firebase Admin initialization removed here due to Node.js compatibility issues
// with buffer-equal-constant-time. Authentication is handled client-side via Firebase Auth SDK.

// Extend the default Session type
interface ExtendedSession extends NextAuthSession {
  accessToken?: string;
  userId?: string;
  provider?: string;
}

// Log environment and configuration details
console.log("NextAuth Configuration:");
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log(
  "Expected Google callback URL:",
  `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
);
console.log(
  "Expected GitHub callback URL:",
  `${process.env.NEXTAUTH_URL}/api/auth/callback/github`
);
console.log("NODE_ENV:", process.env.NODE_ENV);

if (!process.env.NEXTAUTH_URL) {
  console.error("NEXTAUTH_URL is not set");
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        // --- TODO: Replace with Firebase Auth check ---
        // This section needs to be updated to use Firebase Admin SDK
        // to verify user credentials instead of Prisma.
        // Example (conceptual - needs implementation based on your Firebase setup):
        /*
        try {
          const userRecord = await admin.auth().getUserByEmail(credentials.email);
          // Need a way to verify password - Firebase Auth doesn't store passwords directly.
          // Typically, you handle sign-in client-side with Firebase SDK and 
          // then verify the ID token server-side, or use custom auth.
          // For CredentialsProvider, you might need a custom password hashing/checking 
          // mechanism stored alongside user data if not using Firebase client-side auth.
          // Placeholder for now:
          if (!userRecord) { // Basic check if user exists in Firebase Auth
             throw new Error("No user found with this email.");
          }
          // Password verification logic is missing here because Firebase Auth handles it differently
          
          return {
            id: userRecord.uid, // Use Firebase UID
            name: userRecord.displayName,
            email: userRecord.email,
            image: userRecord.photoURL,
            emailVerified: userRecord.emailVerified,
          };
        } catch (error) {
          console.error("Firebase Auth Error:", error);
          throw new Error("Authentication failed.");
        }
        */
        // --- End of TODO section ---

        // Temporary return while Firebase logic is implemented
        throw new Error("CredentialsProvider needs Firebase implementation");
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    // error: '/auth/error', // Optional error page
    // newUser: '/auth/new-user' // Optional new user page
  },
  callbacks: {
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT;
      user?: NextAuthUser | AdapterUser | null;
      account?: { access_token?: string | null; provider: string } | null;
    }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id;
        token.provider = account.provider;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: NextAuthSession;
      token: JWT;
    }) {
      const extendedSession = session as ExtendedSession;
      if (token) {
        extendedSession.accessToken = token.accessToken as string | undefined;
        extendedSession.userId = token.sub;
        extendedSession.provider = token.provider as string | undefined;
      }
      return extendedSession;
    },
    async signIn({
      user,
      account,
    }: {
      user: NextAuthUser | AdapterUser;
      account?: { provider: string } | null;
    }) {
      console.log("signIn callback:", { user, account });
      if (account?.provider !== "credentials") {
        return true;
      }
      if (user) {
        return true;
      }
      return false;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn(message: { user: { email?: string | null } }) {
      console.log("User signed in:", message.user?.email);
    },
    async signOut(message: { session: NextAuthSession }) {
      console.log("User signed out:", message.session);
    },
    async createUser(message: { user: NextAuthUser }) {
      console.log("User created:", message.user);
    },
    async updateUser(message: { user: NextAuthUser }) {
      console.log("User updated:", message.user);
    },
    async linkAccount(message: { account: { provider: string } }) {
      console.log("Account linked:", message.account.provider);
    },
    async session(message: { session: NextAuthSession }) {
      // console.log("Session event:", message.session);
    },
  },
  debug: process.env.NODE_ENV === "development",
};
