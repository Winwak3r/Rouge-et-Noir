-- CreateTable
CREATE TABLE "CompetitionLogo" (
    "code" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionLogo_pkey" PRIMARY KEY ("code")
);
