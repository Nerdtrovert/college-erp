-- Keep department as informational faculty metadata only. Students are identified
-- by their canonical program and class group.
UPDATE "User"
SET "department" = NULL
WHERE "role" = 'student';

UPDATE "User"
SET "program" = NULL,
    "classGroup" = NULL
WHERE "role" <> 'student';

ALTER TABLE "User"
ADD CONSTRAINT "User_role_academic_fields_check"
CHECK (
  ("role" = 'student' AND "department" IS NULL)
  OR
  ("role" <> 'student' AND "program" IS NULL AND "classGroup" IS NULL)
);
