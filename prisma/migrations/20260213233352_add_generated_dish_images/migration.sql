-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "GeneratedDishImage" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "generationPrompt" TEXT,
    "generationVersion" TEXT NOT NULL DEFAULT 'v1',
    "generationModel" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDishImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDishImage_normalizedName_key" ON "GeneratedDishImage"("normalizedName");

-- CreateIndex
CREATE INDEX "GeneratedDishImage_status_idx" ON "GeneratedDishImage"("status");

