-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifPromptAt" TIMESTAMP(3);

-- Les joueurs déjà inscrits ne reçoivent pas la proposition d'activer les notifications.
UPDATE "User" SET "notifPromptAt" = NOW() WHERE "notifPromptAt" IS NULL;
