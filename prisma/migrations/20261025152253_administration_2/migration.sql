-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "deadlineAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "adminLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testAt" TIMESTAMP(3),
    "pendingTitle" TEXT,
    "pendingBody" TEXT,
    "pendingUrl" TEXT,
    "pendingAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSent" (
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSent_pkey" PRIMARY KEY ("userId","matchId")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL DEFAULT 'current',
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "askNotifications" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Verrouillage des pronostics imposé par la base de données.
-- À intégrer dans une migration :
--   npx prisma migrate dev --create-only --name prediction_lock
--   puis coller ce fichier à la fin du migration.sql généré, et appliquer.
--
-- Prisma stocke les DateTime en "timestamp(3)" sans fuseau, en UTC :
-- on compare avec l'heure UTC du serveur de base, jamais celle du navigateur.
-- La cote (scorerOdds…) et lockedAt restent modifiables au moment du verrouillage.
-- Correction exceptionnelle par un admin, dans une transaction :
--   SET LOCAL app.admin_override = 'on';   (et journaliser dans AdminAuditLog)

CREATE OR REPLACE FUNCTION enforce_prediction_lock() RETURNS trigger AS $$
DECLARE
  k timestamp;
  dl timestamp;
  s "MatchStatus";
BEGIN
  IF coalesce(current_setting('app.admin_override', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  SELECT "kickoffAt", "deadlineAt", "status" INTO k, dl, s FROM "Match" WHERE "id" = NEW."matchId";
  -- Date limite effective : celle de l'admin si elle est plus tôt que le coup d'envoi.
  IF dl IS NOT NULL AND dl < k THEN
    k := dl;
  END IF;

  -- Un match reporté n'a pas été joué : modifiable jusqu'à sa nouvelle date.
  IF s IN ('LIVE', 'INTERRUPTED', 'FINISHED', 'CANCELLED')
     OR (s <> 'POSTPONED' AND (now() AT TIME ZONE 'UTC') >= k) THEN
    RAISE EXCEPTION 'PREDICTION_LOCKED' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prediction_lock ON "Prediction";
CREATE TRIGGER prediction_lock
  BEFORE INSERT OR UPDATE OF "rennesGoals", "opponentGoals", "scorerId", "noScorerPick", "matchId", "userId"
  ON "Prediction"
  FOR EACH ROW EXECUTE FUNCTION enforce_prediction_lock();
