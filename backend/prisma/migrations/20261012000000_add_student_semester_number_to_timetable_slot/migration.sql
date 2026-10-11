/*
  Warnings:

  - The migration will add a nullable column `studentSemesterNumber` to the `TimetableSlot` table.
  - The unique constraint will be changed from `[classGroup, day, slotIndex, semesterId]` to `[classGroup, day, slotIndex, semesterId, studentSemesterNumber]`.
  - Since the column is nullable, existing rows will have NULL for this field, and the unique constraint will treat NULL as distinct values (so multiple rows with NULL can exist, which is acceptable for legacy records).
*/

-- AlterTable
ALTER TABLE "TimetableSlot" ADD COLUMN "studentSemesterNumber" integer;

-- DropIndex
DROP INDEX "TimetableSlot_classGroup_day_slotIndex_semesterId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_classGroup_day_slotIndex_semesterId_studentSemesterNumber_key" ON "TimetableSlot"("classGroup", "day", "slotIndex", "semesterId", "studentSemesterNumber");
