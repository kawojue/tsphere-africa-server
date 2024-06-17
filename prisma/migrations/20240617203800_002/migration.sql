-- CreateTable
CREATE TABLE "Country" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "iso2" TEXT,
    "iso3" TEXT,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "state_code" TEXT,
    "countryId" UUID NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
