-- Les joueurs déjà inscrits ne reçoivent pas la proposition d'activer les notifications.
UPDATE "User" SET "notifPromptAt" = NOW() WHERE "notifPromptAt" IS NULL;
