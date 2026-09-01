-- AlterTable
ALTER TABLE "data_palka" ADD COLUMN     "point" DECIMAL(4,2),
ADD COLUMN     "suhu" INTEGER,
ADD COLUMN     "tinggi_cm" INTEGER;

-- CreateTable
CREATE TABLE "sounding_table" (
    "id" SERIAL NOT NULL,
    "nama_palka" VARCHAR(50) NOT NULL,
    "tinggi_cm" INTEGER NOT NULL,
    "volume_liter" DECIMAL(12,4) NOT NULL,
    "beda_liter" DECIMAL(8,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sounding_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "density_table" (
    "id" SERIAL NOT NULL,
    "suhu" INTEGER NOT NULL,
    "density" DECIMAL(6,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "density_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faktor_koreksi_table" (
    "id" SERIAL NOT NULL,
    "suhu" INTEGER NOT NULL,
    "faktor_koreksi" DECIMAL(8,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faktor_koreksi_table_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sounding_table_nama_palka_tinggi_cm_key" ON "sounding_table"("nama_palka", "tinggi_cm");

-- CreateIndex
CREATE UNIQUE INDEX "density_table_suhu_key" ON "density_table"("suhu");

-- CreateIndex
CREATE UNIQUE INDEX "faktor_koreksi_table_suhu_key" ON "faktor_koreksi_table"("suhu");
