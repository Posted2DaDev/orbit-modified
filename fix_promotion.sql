-- Drop foreign key constraints (all possible names)
ALTER TABLE "Promotion" DROP CONSTRAINT IF EXISTS "Promotion_currentRoleId_fkey";
ALTER TABLE "Promotion" DROP CONSTRAINT IF EXISTS "Promotion_recommendedRoleId_fkey";
ALTER TABLE "Promotion" DROP CONSTRAINT IF EXISTS "Promotion_currentRoleIdTorole_fkey";
ALTER TABLE "Promotion" DROP CONSTRAINT IF EXISTS "Promotion_recommendedRoleIdTorole_fkey";

-- Drop indexes on old columns first
DROP INDEX IF EXISTS "Promotion_currentRoleId_idx";
DROP INDEX IF EXISTS "Promotion_recommendedRoleId_idx";

-- Change columns from UUID to text
ALTER TABLE "Promotion" 
  ALTER COLUMN "currentRoleId" TYPE TEXT,
  ALTER COLUMN "recommendedRoleId" TYPE TEXT;

-- Rename columns
ALTER TABLE "Promotion" RENAME COLUMN "currentRoleId" TO "currentRole";
ALTER TABLE "Promotion" RENAME COLUMN "recommendedRoleId" TO "recommendedRole";
