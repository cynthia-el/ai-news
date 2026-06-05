-- CreateTable
CREATE TABLE "DingTalkWebhook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DingTalkWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DingTalkWebhook_isActive_idx" ON "DingTalkWebhook"("isActive");
