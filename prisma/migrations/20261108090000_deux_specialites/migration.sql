-- « Les Spécialités Maison » : plus que deux bonus (Kouign-Amann, Galette-Saucisse).
-- Les bonus déjà choisis avec les anciennes spécialités sont supprimés (comme s'ils n'avaient pas été choisis).
DELETE FROM "BonusUse" WHERE "kind"::text IN ('GALETTES_SAUCISSES', 'PILE_CREPES');
DELETE FROM "BonusGrant" WHERE "kind"::text IN ('GALETTES_SAUCISSES', 'PILE_CREPES');

ALTER TABLE "BonusUse" DROP CONSTRAINT IF EXISTS "BonusUse_secondScorerId_fkey";
ALTER TABLE "BonusUse" DROP COLUMN IF EXISTS "secondScorerId";

ALTER TYPE "BonusKind" RENAME TO "BonusKind_old";
CREATE TYPE "BonusKind" AS ENUM ('KOUIGN_AMANN', 'GALETTE_SAUCISSE');
ALTER TABLE "BonusUse" ALTER COLUMN "kind" TYPE "BonusKind" USING ("kind"::text::"BonusKind");
ALTER TABLE "BonusGrant" ALTER COLUMN "kind" TYPE "BonusKind" USING ("kind"::text::"BonusKind");
DROP TYPE "BonusKind_old";
