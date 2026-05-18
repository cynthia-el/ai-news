-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT,
    "reason" TEXT,
    "content" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Daily" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "itemIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "totalFetched" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorMessage" TEXT,
    "dailyGenerated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrawlLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_url_key" ON "Item"("url");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE INDEX "Item_publishedAt_idx" ON "Item"("publishedAt");

-- CreateIndex
CREATE INDEX "Item_isSelected_publishedAt_idx" ON "Item"("isSelected", "publishedAt");

-- CreateIndex
CREATE INDEX "Item_source_idx" ON "Item"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Daily_date_key" ON "Daily"("date");

-- CreateIndex
CREATE INDEX "CrawlLog_startedAt_idx" ON "CrawlLog"("startedAt");

-- CreateIndex
CREATE INDEX "CrawlLog_status_idx" ON "CrawlLog"("status");
