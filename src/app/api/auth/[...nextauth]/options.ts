import { AuthOptions, Profile } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/prisma"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { Account } from "next-auth"
import bcrypt from "bcrypt"
import { Account as PrismaAccount } from "@prisma/client"

// Log the callback URLs that should be configured
console.log('OAuth Callback URLs that should be configured:');
console.log(`Google: ${process.env.NEXTAUTH_URL}/api/auth/callback/google`);
console.log(`GitHub: ${process.env.NEXTAUTH_URL}/api/auth/callback/github`);

interface SignInParams {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
  };
  account: Account | null;
  profile?: Profile;
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
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn Callback - Start');
      console.log('User:', { id: user.id, email: user.email, name: user.name });
      console.log('Account:', account ? {
        provider: account.provider,
        type: account.type,
        providerAccountId: account.providerAccountId
      } : 'No account');
      console.log('Profile:', profile);

      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { accounts: true },
        });

        console.log('Existing user:', existingUser ? {
          id: existingUser.id,
          email: existingUser.email,
          accountsCount: existingUser.accounts.length
        } : 'Not found');

        if (existingUser) {
          const existingAccount = existingUser.accounts.find(
            (acc: PrismaAccount) => acc.provider === account?.provider
          );

          console.log('Existing account for this provider:', existingAccount ? {
            provider: existingAccount.provider,
            type: existingAccount.type
          } : 'None');

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
              console.log('Account link created:', {
                provider: newAccount.provider,
                type: newAccount.type
              });
            } catch (error) {
              console.error('Error linking account:', error);
              return false;
            }
          }
        } else {
          console.log('No existing user found, adapter will create new user');
        }

        console.log('SignIn Callback - Success');
        return true;
      } catch (error) {
        console.error('SignIn Callback - Error:', error);
        return false;
      }
    },
    async session({ session, token }) {
      console.log('Session Callback', {
        sessionUser: session?.user,
        token: { ...token, sub: token.sub }
      });
      
      if (session?.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      console.log('JWT Callback', {
        tokenSub: token.sub,
        userId: user?.id,
        accountProvider: account?.provider
      });
      return token;
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