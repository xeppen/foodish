import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

// Data Access Layer for authentication using Clerk
// Using cache() to deduplicate requests in RSC tree

export const getSession = cache(async () => {
  const { userId } = await auth();
  return userId ? { userId } : null;
});

export const getCurrentUser = cache(async () => {
  const user = await currentUser();
  return user
    ? {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: user.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : user.emailAddresses[0]?.emailAddress,
      }
    : null;
});

// Helper to get user ID for database queries
export const getUserId = cache(async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Ej behörig");
  }
  return userId;
});
