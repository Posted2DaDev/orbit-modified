-- Add workspace management fields for suspension and deletion
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
