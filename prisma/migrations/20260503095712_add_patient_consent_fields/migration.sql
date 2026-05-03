/*
  Warnings:

  - A unique constraint covering the columns `[consentRevokeToken]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "consentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "consentGrantedAt" TIMESTAMP(3),
ADD COLUMN     "consentOtp" TEXT,
ADD COLUMN     "consentOtpExpiry" TIMESTAMP(3),
ADD COLUMN     "consentRevokeToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_consentRevokeToken_key" ON "Patient"("consentRevokeToken");
