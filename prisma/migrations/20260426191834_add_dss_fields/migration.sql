-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'EXPIRY_LIQUIDATION';
ALTER TYPE "AlertType" ADD VALUE 'STOCKOUT_RISK';

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "avgDailySales" DOUBLE PRECISION NOT NULL DEFAULT 10;
