import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Create auth middleware using edge-compatible config (no database adapter)
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Match all routes except static files and API routes that don't need auth
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (auth routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)",
  ],
};
