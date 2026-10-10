-- CreateTable
CREATE TABLE "day_passes" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "validOn" TIMESTAMP(3) NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "day_passes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "day_passes_gymId_validOn_idx" ON "day_passes"("gymId", "validOn");

-- AddForeignKey
ALTER TABLE "day_passes" ADD CONSTRAINT "day_passes_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
