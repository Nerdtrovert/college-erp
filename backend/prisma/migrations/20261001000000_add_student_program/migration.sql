ALTER TABLE "User" ADD COLUMN "program" TEXT;
ALTER TABLE "User" ALTER COLUMN "department" DROP NOT NULL;

UPDATE "User"
SET "program" = CASE
  WHEN LOWER(COALESCE("department", '')) LIKE '%cse%'
    OR LOWER(COALESCE("department", '')) LIKE '%computer science%' THEN 'CSE'
  WHEN LOWER(COALESCE("department", '')) LIKE '%ise%'
    OR LOWER(COALESCE("department", '')) LIKE '%information science%' THEN 'ISE'
  WHEN LOWER(COALESCE("department", '')) LIKE '%ai%'
    OR LOWER(COALESCE("department", '')) LIKE '%artificial intelligence%' THEN 'AI&DS'
  WHEN LOWER(COALESCE("department", '')) LIKE '%ece%'
    OR LOWER(COALESCE("department", '')) LIKE '%electronics%'
    OR LOWER(TRIM(COALESCE("department", ''))) = 'ec' THEN 'ECE'
  ELSE NULL
END
WHERE "role" = 'student';

UPDATE "User"
SET "program" = ARRAY['CSE', 'ISE', 'AI&DS', 'ECE'][1 + (abs(hashtext("id")::bigint) % 4)]
WHERE "role" = 'student' AND "program" IS NULL;

UPDATE "User"
SET "department" = NULL
WHERE "role" = 'student';

CREATE INDEX "User_role_program_idx" ON "User"("role", "program");
