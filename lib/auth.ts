import { auth } from "@/auth";
import { cache } from "react";

// Data Access Layer for authentication
// Using cache() to deduplicate requests in RSC tree
export const getSession = cache(async () => {
  const session = await auth();
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  return session?.user;
});
