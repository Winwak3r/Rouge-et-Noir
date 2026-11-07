-- CreateEnum
CREATE TYPE "BonusKind" AS ENUM ('KOUIGN_AMANN', 'GALETTES_SAUCISSES', 'PILE_CREPES');

-- CreateTable
CREATE TABLE "BonusUse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "kind" "BonusKind" NOT NULL,
    "secondScorerId" TEXT,
    "points" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "kind" "BonusKind" NOT NULL,
    "delta" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BonusUse_leagueId_idx" ON "BonusUse"("leagueId");

-- CreateIndex
CREATE INDEX "BonusUse_matchId_idx" ON "BonusUse"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "BonusUse_userId_leagueId_matchId_key" ON "BonusUse"("userId", "leagueId", "matchId");

-- CreateIndex
CREATE INDEX "BonusGrant_userId_leagueId_idx" ON "BonusGrant"("userId", "leagueId");

-- AddForeignKey
ALTER TABLE "BonusUse" ADD CONSTRAINT "BonusUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusUse" ADD CONSTRAINT "BonusUse_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusUse" ADD CONSTRAINT "BonusUse_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusUse" ADD CONSTRAINT "BonusUse_secondScorerId_fkey" FOREIGN KEY ("secondScorerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusGrant" ADD CONSTRAINT "BonusGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusGrant" ADD CONSTRAINT "BonusGrant_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
