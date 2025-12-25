import { createAuth } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";

export const runtime = "edge";

async function handler(request: Request) {
  const env = await getEnv();
  const { handlers } = createAuth(env);

  // Determine which handler to use based on the request method
  if (request.method === "GET") {
    return handlers.GET(request);
  }
  return handlers.POST(request);
}

export { handler as GET, handler as POST };
