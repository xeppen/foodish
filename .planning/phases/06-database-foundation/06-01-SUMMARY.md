# 06-01 Summary

- Added `Rating` and `Complexity` enums in `prisma/schema.prisma`.
- Extended `Meal` with `rating` and `complexity` defaults (`NEUTRAL`, `MEDIUM`).
- Added indexes: `@@index([userId, rating])`, `@@index([userId, complexity])`.
- Validation: `npx prisma format` passed.
