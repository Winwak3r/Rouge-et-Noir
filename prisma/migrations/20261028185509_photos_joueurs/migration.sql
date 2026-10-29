-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "customPhotoAt" TIMESTAMP(3),
ADD COLUMN     "officialPhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "PlayerImage" (
    "playerId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerImage_pkey" PRIMARY KEY ("playerId")
);

-- AddForeignKey
ALTER TABLE "PlayerImage" ADD CONSTRAINT "PlayerImage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
