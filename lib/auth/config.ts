import { users } from "@/drizzle/schema";
import { getLocalDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { z } from "zod";

// Credentials schema for email/password validation
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Base Auth.js configuration without database adapter.
 * This is used for Edge runtime compatibility (middleware).
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  providers: [
    // GitHub OAuth
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Email/Password credentials
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        // NOTE: In production, you should:
        // 1. Look up the user in the database
        // 2. Verify the password hash
        // 3. Return the user object or null

        // This is a placeholder implementation for demo purposes
        // You MUST replace this with proper authentication logic
        console.warn(
          "⚠️ Using demo credentials provider. Replace with real authentication in production!"
        );

        // Demo user for testing (remove in production)
        if (parsed.data.email === "demo@example.com" && parsed.data.password === "password123") {
          // Try to find or create the demo user in the database
          try {
            const db = getLocalDb();
            const existingUsers = await db
              .select()
              .from(users)
              .where(eq(users.email, parsed.data.email))
              .limit(1);

            if (existingUsers.length > 0) {
              return {
                id: existingUsers[0].id,
                email: existingUsers[0].email,
                name: existingUsers[0].name,
              };
            }

            // Create the demo user if it doesn't exist
            const newUsers = await db
              .insert(users)
              .values({
                email: parsed.data.email,
                name: "Demo User",
                emailVerified: new Date(),
              })
              .returning();

            return {
              id: newUsers[0].id,
              email: newUsers[0].email,
              name: newUsers[0].name,
            };
          } catch (error) {
            console.error("Error creating demo user:", error);
            // Fallback to in-memory user if database fails
            return {
              id: "demo-user-id",
              email: parsed.data.email,
              name: "Demo User",
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnProtected = nextUrl.pathname.startsWith("/api/protected");

      if (isOnDashboard || isOnProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
};

export default authConfig;
