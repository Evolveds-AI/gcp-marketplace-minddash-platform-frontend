-- Migración para renombrar EMPRESAS a Client
-- Renombrar tabla empresas a clients
ALTER TABLE "empresas" RENAME TO "clients";

-- Renombrar columna empresa_id a client_id en tabla usuarios
ALTER TABLE "usuarios" RENAME COLUMN "empresa_id" TO "client_id";

-- Actualizar constraint de foreign key
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_empresa_id_fkey";
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;