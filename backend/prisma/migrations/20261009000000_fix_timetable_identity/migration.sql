/*
  Warnings:

  - A unique constraint covering the columns `[classGroup,day,slotIndex,semesterId]` on the table `TimetableSlot` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TimetableSlot_classGroup_day_slotIndex_semesterId_batchYear_key";

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_classGroup_day_slotIndex_semesterId_key" ON "TimetableSlot"("classGroup", "day", "slotIndex", "semesterId");
