import { AuthOptions, Profile } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/prisma"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { Account } from "next-auth"
import bcrypt from "bcrypt"
import { Account as PrismaAccount } from "@prisma/client"

// Test database connection on startup
prisma.$connect()
  .then(() => {
    console.log('Database connection test successful');
    return prisma.user.count();
  })
  .then((userCount) => {
    console.log(`Database has ${userCount} users`);
  })
  .catch((error) => {
    console.error('Database connection test failed:', error);
  });

// Log environment and configuration details
console.log('NextAuth Configuration:');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('Expected Google callback URL:', `${process.env.NEXTAUTH_URL}/api/auth/callback/google`);
console.log('Expected GitHub callback URL:', `${process.env.NEXTAUTH_URL}/api/auth/callback/github`);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

if (!process.env.NEXTAUTH_URL) {
  console.error('NEXTAUTH_URL is not set');
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user || !user.password) {
            throw new Error('Invalid credentials');
          }

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            throw new Error('Invalid credentials');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Database error in authorize:', error);
          throw new Error('Database error during authentication');
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/github`
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn Callback - Start');
      console.log('Auth Request Details:', {
        callbackUrl: process.env.NEXTAUTH_URL + '/api/auth/callback/' + (account?.provider || 'unknown'),
        provider: account?.provider,
        type: account?.type
      });

      try {
        // Test database connection before proceeding
        await prisma.$connect();
        console.log('Database connection verified in signIn callback');

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { accounts: true },
        });

        console.log('Existing user lookup result:', existingUser ? {
          id: existingUser.id,
          email: existingUser.email,
          accountsCount: existingUser.accounts.length
        } : 'Not found');

        if (existingUser) {
          const existingAccount = existingUser.accounts.find(
            (acc: PrismaAccount) => acc.provider === account?.provider
          );

          if (!existingAccount && account) {
            console.log('Creating new account link');
            try {
              const newAccount = await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  token_type: account.token_type,
                  scope: account.scope,
                  expires_at: account.expires_at,
                  id_token: account.id_token,
                  refresh_token: account.refresh_token
                },
              });
              console.log('Account link created successfully');
            } catch (error) {
              console.error('Database error creating account link:', error);
              return false;
            }
          }
        } else {
          console.log('No existing user - adapter will create new user');
          // Test if we can create a user
          try {
            const testUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name
              }
            });
            console.log('Test user creation successful');
            // Clean up test user
            await prisma.user.delete({ where: { id: testUser.id } });
          } catch (error) {
            console.error('Database error testing user creation:', error);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('Database error in signIn callback:', error);
        return false;
      } finally {
        try {
          await prisma.$disconnect();
        } catch (error) {
          console.error('Error disconnecting from database:', error);
        }
      }
    },
    async session({ session, token }) {
      try {
        if (session?.user) {
          session.user.id = token.sub as string;
        }
        return session;
      } catch (error) {
        console.error('Error in session callback:', error);
        return session;
      }
    },
    async jwt({ token, user, account }) {
      try {
        return token;
      } catch (error) {
        console.error('Error in JWT callback:', error);
        return token;
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt" as const
  },
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      console.error('Auth Error:', { code, metadata });
    },
    warn(code) {
      console.warn('Auth Warning:', { code });
    },
    debug(code, metadata) {
      console.log('Auth Debug:', { code, metadata });
    }
  }
} 