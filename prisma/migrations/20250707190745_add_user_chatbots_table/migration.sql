-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "iam_role" TEXT NOT NULL DEFAULT 'user',
    "empresa_id" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions_events" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_chatbots" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "chatbot_id" TEXT NOT NULL,
    "chatbot_name" TEXT NOT NULL,
    "chatbot_path" TEXT NOT NULL,
    "gcp_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,

    CONSTRAINT "user_chatbots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWpp" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWpp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "app_name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "state" JSONB,
    "create_time" TIMESTAMP(3) NOT NULL,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("app_name","user_id","id")
);

-- CreateTable
CREATE TABLE "app_states" (
    "app_name" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_states_pkey" PRIMARY KEY ("app_name")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "invocation_id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "branch" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "content" JSONB,
    "actions" BYTEA NOT NULL,
    "long_running_tool_ids_json" TEXT,
    "grounding_metadata" JSONB,
    "partial" BOOLEAN,
    "turn_complete" BOOLEAN,
    "error_code" TEXT,
    "error_message" TEXT,
    "interrupted" BOOLEAN,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_states" (
    "app_name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_states_pkey" PRIMARY KEY ("app_name","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_chatbots_usuario_id_chatbot_id_key" ON "user_chatbots"("usuario_id", "chatbot_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserWpp_phoneNumber_key" ON "UserWpp"("phoneNumber");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions_events" ADD CONSTRAINT "sessions_events_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chatbots" ADD CONSTRAINT "user_chatbots_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserWpp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_app_name_user_id_session_id_fkey" FOREIGN KEY ("app_name", "user_id", "session_id") REFERENCES "sessions"("app_name", "user_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
