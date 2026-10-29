-- AlterTable
ALTER TABLE "League" ADD COLUMN     "competitions" "Competition"[] DEFAULT ARRAY['LIGUE_1', 'EUROPA_LEAGUE', 'COUPE_DE_FRANCE']::"Competition"[],
ADD COLUMN     "description" TEXT;
