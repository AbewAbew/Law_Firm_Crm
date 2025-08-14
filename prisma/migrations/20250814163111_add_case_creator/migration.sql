/*
  Warnings:

  - Added the required column `createdById` to the `Case` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "public"."Case" ADD COLUMN "createdById" TEXT;

-- Update existing cases to use the first partner as creator (or first user if no partner exists)
UPDATE "public"."Case" 
SET "createdById" = (
  SELECT "id" FROM "public"."User" 
  WHERE "role" = 'PARTNER' 
  ORDER BY "createdAt" ASC 
  LIMIT 1
)
WHERE "createdById" IS NULL;

-- If no partner exists, use the first user
UPDATE "public"."Case" 
SET "createdById" = (
  SELECT "id" FROM "public"."User" 
  ORDER BY "createdAt" ASC 
  LIMIT 1
)
WHERE "createdById" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "public"."Case" ALTER COLUMN "createdById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
