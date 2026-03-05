/*
  Warnings:

  - You are about to drop the `sessions_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sessions_events" DROP CONSTRAINT "sessions_events_usuario_id_fkey";

-- DropTable
DROP TABLE "sessions_events";
