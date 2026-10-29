-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "lineupAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MatchLineup" (
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "starter" BOOLEAN NOT NULL,

    CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("matchId","playerId")
);

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
