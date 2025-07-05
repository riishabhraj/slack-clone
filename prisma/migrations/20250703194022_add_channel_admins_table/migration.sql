/*
  Warnings:

  - You are about to drop the `_ChannelAdmins` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ChannelAdmins" DROP CONSTRAINT "_ChannelAdmins_A_fkey";

-- DropForeignKey
ALTER TABLE "_ChannelAdmins" DROP CONSTRAINT "_ChannelAdmins_B_fkey";

-- DropTable
DROP TABLE "_ChannelAdmins";

-- CreateTable
CREATE TABLE "ChannelAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAdmin_userId_channelId_key" ON "ChannelAdmin"("userId", "channelId");

-- AddForeignKey
ALTER TABLE "ChannelAdmin" ADD CONSTRAINT "ChannelAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelAdmin" ADD CONSTRAINT "ChannelAdmin_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
