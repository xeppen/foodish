import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeComplexity(value) {
  if (value === "SIMPLE" || value === "MEDIUM" || value === "COMPLEX") {
    return value;
  }
  return "MEDIUM";
}

async function main() {
  const payloadPath = path.join(__dirname, "starter-common-meals.sv.json");
  const payload = JSON.parse(await fs.readFile(payloadPath, "utf-8"));

  await prisma.commonMeal.createMany({
    data: payload.map((meal, index) => ({
      name: meal.name,
      locale: meal.locale ?? "sv",
      cuisine: meal.cuisine ?? null,
      complexity: normalizeComplexity(meal.complexity),
      imageUrl: meal.imageUrl ?? null,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
