-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "flagUrl" TEXT,
ADD COLUMN     "homegrown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nationality" TEXT;
