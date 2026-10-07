-- CreateEnum
CREATE TYPE "SubjectCourseType" AS ENUM ('NEEDS_CONFIGURATION', 'STANDALONE', 'INTEGRATED', 'PROJECT');

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "courseType" "SubjectCourseType" NOT NULL DEFAULT 'NEEDS_CONFIGURATION';

-- Data Migration
UPDATE "Subject"
SET "courseType" = CASE "type"::text
  WHEN 'STANDALONE' THEN 'STANDALONE'::"SubjectCourseType"
  WHEN 'INTEGRATED' THEN 'INTEGRATED'::"SubjectCourseType"
  ELSE 'NEEDS_CONFIGURATION'::"SubjectCourseType"
END;
