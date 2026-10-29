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
