-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushLive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushPrematch" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PushMessage" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "PushMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushEvent" (
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushEvent_pkey" PRIMARY KEY ("userId","matchId","kind")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "externalEventKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "forRennes" BOOLEAN NOT NULL,
    "minute" INTEGER,
    "extraMinute" INTEGER,
    "playerName" TEXT NOT NULL,
    "playerOutName" TEXT,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushMessage_subscriptionId_deliveredAt_idx" ON "PushMessage"("subscriptionId", "deliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvent_matchId_externalEventKey_key" ON "MatchEvent"("matchId", "externalEventKey");

-- AddForeignKey
ALTER TABLE "PushMessage" ADD CONSTRAINT "PushMessage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
