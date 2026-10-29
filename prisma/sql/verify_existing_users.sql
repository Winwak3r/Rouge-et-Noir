-- Les comptes créés avant la confirmation d'adresse e-mail sont considérés comme confirmés.
UPDATE "User" SET "emailVerifiedAt" = NOW() WHERE "emailVerifiedAt" IS NULL;
