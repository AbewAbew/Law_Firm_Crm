-- CreateEnum
CREATE TYPE "public"."InvoiceEntryStatus" AS ENUM ('UNBILLED', 'BILLED', 'PAID');

-- AlterTable
ALTER TABLE "public"."ActiveTimer" ADD COLUMN     "rate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."TimeEntry" ADD COLUMN     "billableAmount" DOUBLE PRECISION,
ADD COLUMN     "invoiceStatus" "public"."InvoiceEntryStatus" NOT NULL DEFAULT 'UNBILLED';
