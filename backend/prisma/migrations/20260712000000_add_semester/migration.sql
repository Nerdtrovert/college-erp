-- CreateEnum
CREATE TYPE "SemesterStatus" AS ENUM ('ACTIVE', 'UPCOMING', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "status" "SemesterStatus" NOT NULL,
    "createdAt" TIMESTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTZ(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- Add semesterId to AttendanceSession
ALTER TABLE "AttendanceSession" ADD COLUMN "semesterId" TEXT;
-- Add foreign key
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add semesterId to Mark
ALTER TABLE "Mark" ADD COLUMN "semesterId" TEXT;
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add semesterId to TimetableSlot
ALTER TABLE "TimetableSlot" ADD COLUMN "semesterId" TEXT;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraints and add new ones with semesterId
ALTER TABLE "AttendanceSession" DROP CONSTRAINT "AttendanceSession_subjectCode_date_classGroup_key";
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_subjectCode_date_classGroup_semesterId_key" UNIQUE ("subjectCode", "date", "classGroup", "semesterId");

ALTER TABLE "Mark" DROP CONSTRAINT "Mark_studentId_subjectCode_type_key";
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_studentId_subjectCode_type_semesterId_key" UNIQUE ("studentId", "subjectCode", "type", "semesterId");

ALTER TABLE "TimetableSlot" DROP CONSTRAINT "TimetableSlot_classGroup_day_slotIndex_key";
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_classGroup_day_slotIndex_semesterId_key" UNIQUE ("classGroup", "day", "slotIndex", "semesterId");

-- Insert a default semester for existing data
INSERT INTO "Semester" ("id", "name", "startDate", "endDate", "status", "createdAt", "updatedAt")
VALUES ('sem1', 'Fall 2024', '2024-08-01', '2024-12-20', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Update existing rows to reference the default semester
UPDATE "AttendanceSession" SET "semesterId" = 'sem1' WHERE "semesterId" IS NULL;
UPDATE "Mark" SET "semesterId" = 'sem1' WHERE "semesterId" IS NULL;
UPDATE "TimetableSlot" SET "semesterId" = 'sem1' WHERE "semesterId" IS NULL;

-- Make semesterId NOT NULL after populating
ALTER TABLE "AttendanceSession" ALTER COLUMN "semesterId" SET NOT NULL;
ALTER TABLE "Mark" ALTER COLUMN "semesterId" SET NOT NULL;
ALTER TABLE "TimetableSlot" ALTER COLUMN "semesterId" SET NOT NULL;