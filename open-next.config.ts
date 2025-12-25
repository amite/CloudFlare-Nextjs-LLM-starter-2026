import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Cache interception for optimized caching behavior
  // Set to false if using Partial Prerendering (PPR)
  enableCacheInterception: true,
});
