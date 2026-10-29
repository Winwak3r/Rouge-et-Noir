-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tutorialDoneAt" TIMESTAMP(3);

-- Les joueurs déjà inscrits connaissent le site : pas de didacticiel pour eux.
UPDATE "User" SET "tutorialDoneAt" = NOW() WHERE "tutorialDoneAt" IS NULL;
