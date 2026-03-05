/*
  Warnings:

  - The primary key for the `app_states` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `app_name` on the `app_states` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - The primary key for the `events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `app_name` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `user_id` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `session_id` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `invocation_id` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(256)`.
  - You are about to alter the column `author` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(256)`.
  - You are about to alter the column `branch` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(256)`.
  - You are about to alter the column `error_code` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(256)`.
  - You are about to alter the column `error_message` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1024)`.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `app_name` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `user_id` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `id` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - The primary key for the `user_chatbots` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_states` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `app_name` on the `user_states` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `user_id` on the `user_states` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to drop the column `empresa_id` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the `empresas` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `state` on table `sessions` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `client_id` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_app_name_user_id_session_id_fkey";

-- DropForeignKey
ALTER TABLE "user_chatbots" DROP CONSTRAINT "user_chatbots_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_empresa_id_fkey";

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "text" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "createdAt" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "updatedAt" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(6);

-- AlterTable
ALTER TABLE "UserWpp" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(6);

-- AlterTable
ALTER TABLE "app_states" DROP CONSTRAINT "app_states_pkey",
ALTER COLUMN "app_name" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "update_time" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "app_states_pkey" PRIMARY KEY ("app_name");

-- AlterTable
ALTER TABLE "events" DROP CONSTRAINT "events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "app_name" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "session_id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "invocation_id" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "author" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "branch" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "error_code" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "error_message" SET DATA TYPE VARCHAR(1024),
ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id", "app_name", "user_id", "session_id");

-- AlterTable
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey",
ALTER COLUMN "app_name" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "state" SET NOT NULL,
ALTER COLUMN "create_time" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "update_time" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("app_name", "user_id", "id");

-- AlterTable
ALTER TABLE "user_chatbots" DROP CONSTRAINT "user_chatbots_pkey",
ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "id" SET DATA TYPE VARCHAR,
ALTER COLUMN "usuario_id" SET DATA TYPE VARCHAR,
ALTER COLUMN "chatbot_id" SET DATA TYPE VARCHAR,
ALTER COLUMN "chatbot_name" SET DATA TYPE VARCHAR,
ALTER COLUMN "chatbot_path" SET DATA TYPE VARCHAR,
ALTER COLUMN "gcp_name" SET DATA TYPE VARCHAR,
ALTER COLUMN "assigned_at" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "assigned_by" SET DATA TYPE VARCHAR,
ADD CONSTRAINT "user_chatbots_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_states" DROP CONSTRAINT "user_states_pkey",
ALTER COLUMN "app_name" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "update_time" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "user_states_pkey" PRIMARY KEY ("app_name", "user_id");

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "empresa_id",
ADD COLUMN     "can_manage_users" BOOLEAN DEFAULT false,
ADD COLUMN     "client_id" TEXT NOT NULL,
ADD COLUMN     "primary_chatbot_id" VARCHAR(255),
ADD COLUMN     "role_type" VARCHAR(50);

-- DropTable
DROP TABLE "empresas";

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUser" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "scope" TEXT NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolesAcDatos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "RolesAcDatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_owners" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" TEXT NOT NULL,
    "chatbot_id" TEXT NOT NULL,
    "chatbot_name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "permissions" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatbot_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lastMessage" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_name" TEXT NOT NULL,
    "usuario_id" TEXT,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions_user" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "jwt_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "refresh_expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_chatbot" ON "chatbot_owners"("usuario_id", "chatbot_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_user_jwt_token_key" ON "sessions_user"("jwt_token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_user_refresh_token_key" ON "sessions_user"("refresh_token");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUser" ADD CONSTRAINT "ProductUser_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUser" ADD CONSTRAINT "ProductUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolesAcDatos" ADD CONSTRAINT "RolesAcDatos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_owners" ADD CONSTRAINT "fk_chatbot_owner_user" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_app_name_user_id_session_id_fkey" FOREIGN KEY ("app_name", "user_id", "session_id") REFERENCES "sessions"("app_name", "user_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions_user" ADD CONSTRAINT "sessions_user_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chatbots" ADD CONSTRAINT "user_chatbots_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
