ALTER TABLE "AttendanceSession"
ADD COLUMN "startTime" TEXT NOT NULL DEFAULT '',
ADD COLUMN "endTime" TEXT NOT NULL DEFAULT '',
ADD COLUMN "room" TEXT;

ALTER TABLE "AttendanceSession"
DROP CONSTRAINT IF EXISTS "AttendanceSession_subjectCode_date_classGroup_semesterId_key";

ALTER TABLE "AttendanceSession"
ADD CONSTRAINT "AttendanceSession_subjectCode_date_classGroup_semesterId_startTime_endTime_key"
UNIQUE ("subjectCode", "date", "classGroup", "semesterId", "startTime", "endTime");
