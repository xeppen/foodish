import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

// Data Access Layer for authentication using Clerk
// Using cache() to deduplicate requests in RSC tree

type AppUser = {
  id: string;
  email?: string;
  name?: string;
};

function getE2ETestUser(): AppUser | null {
  const userId = process.env.E2E_TEST_USER_ID?.trim();
  if (!userId || process.env.NODE_ENV === "production") {
    return null;
  }
  return {
    id: userId,
    email: process.env.E2E_TEST_USER_EMAIL ?? `${userId}@e2e.local`,
    name: process.env.E2E_TEST_USER_NAME ?? "E2E Test User",
  };
}

export const getSession = cache(async () => {
  const e2eUser = getE2ETestUser();
  if (e2eUser) {
    return { userId: e2eUser.id };
  }
  const { userId } = await auth();
  return userId ? { userId } : null;
});

export const getCurrentUser = cache(async () => {
  const e2eUser = getE2ETestUser();
  if (e2eUser) {
    return e2eUser;
  }
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
  const e2eUser = getE2ETestUser();
  if (e2eUser) {
    return e2eUser.id;
  }
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Ej behörig");
  }
  return userId;
});
