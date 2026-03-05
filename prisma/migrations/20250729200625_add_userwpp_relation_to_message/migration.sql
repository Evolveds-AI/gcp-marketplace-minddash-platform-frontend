/*
  Warnings:

  - You are about to drop the `PRODUCT` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PRODUCT_USER` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ROLES_AC_DATOS` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RolesAcDatos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'EDITOR', 'VIEWER');

-- DropForeignKey
ALTER TABLE "PRODUCT" DROP CONSTRAINT "PRODUCT_client_id_fkey";

-- DropForeignKey
ALTER TABLE "PRODUCT_USER" DROP CONSTRAINT "PRODUCT_USER_product_id_fkey";

-- DropForeignKey
ALTER TABLE "PRODUCT_USER" DROP CONSTRAINT "PRODUCT_USER_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_client_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductUser" DROP CONSTRAINT "ProductUser_product_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductUser" DROP CONSTRAINT "ProductUser_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ROLES_AC_DATOS" DROP CONSTRAINT "ROLES_AC_DATOS_user_id_fkey";

-- DropForeignKey
ALTER TABLE "RolesAcDatos" DROP CONSTRAINT "RolesAcDatos_user_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_client_id_fkey";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "userWppId" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "last_role_update" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "organization_scope" TEXT,
ADD COLUMN     "parent_user_id" TEXT,
ADD COLUMN     "permissions_scope" JSONB DEFAULT '{}',
ADD COLUMN     "role_new" VARCHAR(20) DEFAULT 'VIEWER';

-- DropTable
DROP TABLE "PRODUCT";

-- DropTable
DROP TABLE "PRODUCT_USER";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "ProductUser";

-- DropTable
DROP TABLE "ROLES_AC_DATOS";

-- DropTable
DROP TABLE "Roles";

-- DropTable
DROP TABLE "RolesAcDatos";

-- DropTable
DROP TABLE "clients";

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'chatbot',
    "client_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB DEFAULT '{}',
    "usuarios_asignados" INTEGER NOT NULL DEFAULT 0,
    "mensajes_mes" INTEGER NOT NULL DEFAULT 0,
    "welcome_message" TEXT,
    "max_users" INTEGER NOT NULL DEFAULT 100,
    "features" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PRODUCT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productUser" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PRODUCT_USER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rolesAcDatos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "ROLES_AC_DATOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "scope" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "granted_by" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_audit_log" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "old_role" VARCHAR(50),
    "new_role" VARCHAR(50),
    "changed_by" TEXT,
    "change_reason" TEXT,
    "organization_scope" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "organization_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_sessions_session_token_key" ON "organization_sessions"("session_token");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userWppId_fkey" FOREIGN KEY ("userWppId") REFERENCES "UserWpp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "PRODUCT_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productUser" ADD CONSTRAINT "PRODUCT_USER_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productUser" ADD CONSTRAINT "PRODUCT_USER_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rolesAcDatos" ADD CONSTRAINT "ROLES_AC_DATOS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_audit_log" ADD CONSTRAINT "role_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_audit_log" ADD CONSTRAINT "role_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_sessions" ADD CONSTRAINT "organization_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
