-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PETUGAS', 'VIEWER');

-- CreateEnum
CREATE TYPE "SatuanBL" AS ENUM ('MT', 'KG');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DRAFT', 'SELESAI');

-- CreateEnum
CREATE TYPE "TipePalka" AS ENUM ('KEBERANGKATAN', 'KEDATANGAN');

-- CreateTable
CREATE TABLE "kapal" (
    "id" SERIAL NOT NULL,
    "nama_kapal" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kapal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PETUGAS',
    "kontak_wa" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengiriman" (
    "id" SERIAL NOT NULL,
    "kapal_id" INTEGER NOT NULL,
    "tanggal_berangkat" DATE,
    "tanggal_sampai" DATE,
    "nomor_bl" VARCHAR(100),
    "nilai_bl" DECIMAL(15,3),
    "satuan_bl" "SatuanBL" NOT NULL DEFAULT 'MT',
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengiriman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_palka" (
    "id" SERIAL NOT NULL,
    "pengiriman_id" INTEGER NOT NULL,
    "tipe" "TipePalka" NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 1,
    "nama_palka" VARCHAR(50) NOT NULL,
    "volume" DECIMAL(12,4),
    "density" DECIMAL(8,4),
    "faktor_koreksi" DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
    "berat_hasil" DECIMAL(15,4),

    CONSTRAINT "data_palka_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kapal_nama_kapal_key" ON "kapal"("nama_kapal");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "pengiriman" ADD CONSTRAINT "pengiriman_kapal_id_fkey" FOREIGN KEY ("kapal_id") REFERENCES "kapal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengiriman" ADD CONSTRAINT "pengiriman_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_palka" ADD CONSTRAINT "data_palka_pengiriman_id_fkey" FOREIGN KEY ("pengiriman_id") REFERENCES "pengiriman"("id") ON DELETE CASCADE ON UPDATE CASCADE;
