-- CreateTable
CREATE TABLE "MatchCard" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "externalEventKey" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "forRennes" BOOLEAN NOT NULL,
    "minute" INTEGER,
    "extraMinute" INTEGER,
    "secondYellow" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MatchCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchCard_matchId_externalEventKey_key" ON "MatchCard"("matchId", "externalEventKey");

-- AddForeignKey
ALTER TABLE "MatchCard" ADD CONSTRAINT "MatchCard_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
