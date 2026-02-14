-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- AlterTable
ALTER TABLE "Meal"
ADD COLUMN "preferredDays" "Weekday"[] NOT NULL DEFAULT ARRAY[]::"Weekday"[];

-- AlterTable
ALTER TABLE "UsageHistory"
ADD COLUMN "day" "Weekday";

-- CreateTable
CREATE TABLE "MealDaySignal" (
  "id" TEXT NOT NULL,
  "mealId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "day" "Weekday" NOT NULL,
  "shownCount" INTEGER NOT NULL DEFAULT 0,
  "swappedAwayCount" INTEGER NOT NULL DEFAULT 0,
  "selectedCount" INTEGER NOT NULL DEFAULT 0,
  "lastShownAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MealDaySignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealDaySignal_mealId_userId_day_key" ON "MealDaySignal"("mealId", "userId", "day");

-- CreateIndex
CREATE INDEX "MealDaySignal_userId_day_idx" ON "MealDaySignal"("userId", "day");

-- CreateIndex
CREATE INDEX "MealDaySignal_mealId_idx" ON "MealDaySignal"("mealId");

-- AddForeignKey
ALTER TABLE "MealDaySignal"
ADD CONSTRAINT "MealDaySignal_mealId_fkey"
FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
