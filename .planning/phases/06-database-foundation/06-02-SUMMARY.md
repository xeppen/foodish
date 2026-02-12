# 06-02 Summary

- Added `UsageHistory` model with `mealId` FK and `onDelete: Cascade`.
- Added reverse relation `Meal.usageHistory`.
- Added indexes: `@@index([userId, usedDate])`, `@@index([mealId])`.
- Validation: schema formatting/validation passed.
