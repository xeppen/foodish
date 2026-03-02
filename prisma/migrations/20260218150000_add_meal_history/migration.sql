-- CreateTable
CREATE TABLE "MealHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mealId" TEXT NOT NULL,
  "weekStartDate" TIMESTAMP(3) NOT NULL,
  "dateAssigned" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MealHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealHistory_userId_weekStartDate_idx" ON "MealHistory"("userId", "weekStartDate");

-- CreateIndex
CREATE INDEX "MealHistory_userId_dateAssigned_idx" ON "MealHistory"("userId", "dateAssigned");

-- CreateIndex
CREATE INDEX "MealHistory_mealId_idx" ON "MealHistory"("mealId");

-- AddForeignKey
ALTER TABLE "MealHistory"
ADD CONSTRAINT "MealHistory_mealId_fkey"
FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill historical selections for existing users
INSERT INTO "MealHistory" ("id", "userId", "mealId", "weekStartDate", "dateAssigned")
SELECT
  'legacy_' || "id",
  "userId",
  "mealId",
  "weekStartDate",
  COALESCE("usedDate", "weekStartDate")
FROM "UsageHistory";
