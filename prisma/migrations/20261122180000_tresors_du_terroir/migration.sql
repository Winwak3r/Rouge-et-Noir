-- « Les Trésors du Terroir » remplacent « Les Spécialités Maison ».
-- Les bonus déjà joués sont conservés : la Galette-Saucisse (buteur ×2) devient la Crêpe flambée (même effet),
-- le Kouign-Amann devient la Bigouden ; leurs points déjà calculés ne changent pas.
ALTER TYPE "BonusKind" RENAME VALUE 'GALETTE_SAUCISSE' TO 'CREPE_FLAMBEE';
ALTER TYPE "BonusKind" RENAME VALUE 'KOUIGN_AMANN' TO 'BIGOUDEN';
ALTER TYPE "BonusKind" ADD VALUE 'MENHIRS' BEFORE 'CREPE_FLAMBEE';
