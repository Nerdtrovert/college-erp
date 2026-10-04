-- Create new tables
CREATE TABLE "Subject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SubjectType" NOT NULL DEFAULT 'STANDALONE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Subject_code_key" UNIQUE ("code")
);

CREATE TABLE "SubjectSectionAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subjectId" UUID NOT NULL,
    "classGroup" TEXT NOT NULL,
    "theoryFacultyId" UUID,
    "labFacultyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectSectionAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SubjectSectionAssignment_subjectId_classGroup_key" UNIQUE ("subjectId", "classGroup")
);

-- Add foreign key constraints
ALTER TABLE "SubjectSectionAssignment" ADD CONSTRAINT "SubjectSectionAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE;
ALTER TABLE "SubjectSectionAssignment" ADD CONSTRAINT "SubjectSectionAssignment_theoryFacultyId_fkey" FOREIGN KEY ("theoryFacultyId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "SubjectSectionAssignment" ADD CONSTRAINT "SubjectSectionAssignment_labFacultyId_fkey" FOREIGN KEY ("labFacultyId") REFERENCES "User"("id") ON DELETE SET NULL;

-- Create indexes
CREATE INDEX "SubjectSectionAssignment_subjectId_idx" ON "SubjectSectionAssignment"("subjectId");
CREATE INDEX "SubjectSectionAssignment_theoryFacultyId_idx" ON "SubjectSectionAssignment"("theoryFacultyId");
CREATE INDEX "SubjectSectionAssignment_labFacultyId_idx" ON "SubjectSectionAssignment"("labFacultyId");

-- Now migrate the data from the old Subject table to the new model
-- First, let's back up the old subject data
CREATE TABLE "_SubjectOld" AS SELECT * FROM "Subject";

-- Create canonical subjects from the old subjects
-- We need to group by the canonical code (stripping section suffixes and 'L' for lab)
INSERT INTO "Subject" ("id", "code", "name", "type", "description", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid() as id,
    -- Extract canonical code by removing section suffix and handling lab subjects
    CASE
        WHEN "code" ~ '-L[A-Z]$' THEN regexp_replace("code", '-L[A-Z]$', '')  -- BCS502L-A -> BCS502
        WHEN "code" ~ '[A-Z]$' THEN regexp_replace("code", '[A-Z]$', '')      -- BCS502-A -> BCS502
        ELSE "code"                                         -- BCS502 (no section) -> BCS502
    END as code,
    -- Clean up name by removing section indicators
    CASE
        WHEN "name" ~ '\(.*\)$' THEN regexp_replace("name", '\s*\(.*\)$', '')  -- Remove "(Theory)" or "(Lab)"
        ELSE "name"
    END as name,
    -- Determine type: if we have both theory and lab versions, it's INTEGRATED
    CASE
        WHEN EXISTS (
            SELECT 1 FROM "_SubjectOld" s2 
            WHERE 
                -- Same base code (stripping section and L)
                (
                    CASE
                        WHEN s2."code" ~ '-L[A-Z]$' THEN regexp_replace(s2."code", '-L[A-Z]$', '')
                        WHEN s2."code" ~ '[A-Z]$' THEN regexp_replace(s2."code", '[A-Z]$', '')
                        ELSE s2."code"
                    END
                ) = (
                    CASE
                        WHEN "code" ~ '-L[A-Z]$' THEN regexp_replace("code", '-L[A-Z]$', '')
                        WHEN "code" ~ '[A-Z]$' THEN regexp_replace("code", '[A-Z]$', '')
                        ELSE "code"
                    END
                )
                AND s2."code" <> "code"  -- Different record
        )
        THEN 'INTEGRATED'
        ELSE 'STANDALONE'
    END as type,
    NULL as description,
    "createdAt",
    "updatedAt"
FROM "_SubjectOld"
GROUP BY 
    CASE
        WHEN "code" ~ '-L[A-Z]$' THEN regexp_replace("code", '-L[A-Z]$', '')
        WHEN "code" ~ '[A-Z]$' THEN regexp_replace("code", '[A-Z]$', '')
        ELSE "code"
    END,
    CASE
        WHEN "name" ~ '\(.*\)$' THEN regexp_replace("name", '\s*\(.*\)$', '')
        ELSE "name"
    END,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM "_SubjectOld" s2 
            WHERE 
                -- Same base code (stripping section and L)
                (
                    CASE
                        WHEN s2."code" ~ '-L[A-Z]$' THEN regexp_replace(s2."code", '-L[A-Z]$', '')
                        WHEN s2."code" ~ '[A-Z]$' THEN regexp_replace(s2."code", '[A-Z]$', '')
                        ELSE s2."code"
                    END
                )
                AND s2."code" <> "code"
        )
        THEN 'INTEGRATED'
        ELSE 'STANDALONE'
    END,
    "createdAt",
    "updatedAt"
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "type" = EXCLUDED."type",
    "updatedAt" = EXCLUDED."updatedAt";

-- Create SubjectSectionAssignment records for each old subject
INSERT INTO "SubjectSectionAssignment" ("id", "subjectId", "classGroup", "theoryFacultyId", "labFacultyId", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid() as id,
    s."id" as subjectId,
    -- Extract classGroup from the old subject's classGroup field
    oa."classGroup" as classGroup,
    -- Determine faculty assignment based on whether this is theory or lab
    CASE
        -- If the old subject code ends with -L, it's a lab subject
        WHEN oa."code" ~ '-L[A-Z]$' THEN NULL  -- theoryFacultyId for lab subjects
        ELSE oa."facultyId"::UUID              -- theoryFacultyId for theory subjects
    END as theoryFacultyId,
    CASE
        -- If the old subject code ends with -L, it's a lab subject
        WHEN oa."code" ~ '-L[A-Z]$' THEN oa."facultyId"::UUID  -- labFacultyId for lab subjects
        ELSE NULL                                              -- labFacultyId for theory subjects
    END as labFacultyId,
    oa."createdAt",
    oa."updatedAt"
FROM "_SubjectOld" oa
JOIN "Subject" s ON 
    CASE
        WHEN oa."code" ~ '-L[A-Z]$' THEN regexp_replace(oa."code", '-L[A-Z]$', '')
        WHEN oa."code" ~ '[A-Z]$' THEN regexp_replace(oa."code", '[A-Z]$', '')
        ELSE oa."code"
    END = s.code;

-- Update the related tables to point to the new assignments
-- Update AttendanceSession
ALTER TABLE "AttendanceSession" ADD COLUMN "assignmentId" UUID;
UPDATE "AttendanceSession" 
SET "assignmentId" = ssa."id"
FROM "SubjectSectionAssignment" ssa
JOIN "Subject" s ON ssa."subjectId" = s."id"
JOIN "_SubjectOld" oa ON 
    CASE
        WHEN oa."code" ~ '-L[A-Z]$' THEN regexp_replace(oa."code", '-L[A-Z]$', '')
        WHEN oa."code" ~ '[A-Z]$' THEN regexp_replace(oa."code", '[A-Z]$', '')
        ELSE oa."code"
    END = s.code
WHERE "AttendanceSession"."subjectCode" = oa."code"
  AND "AttendanceSession"."classGroup" = oa."classGroup";

-- Update Mark
ALTER TABLE "Mark" ADD COLUMN "assignmentId" UUID;
UPDATE "Mark" 
SET "assignmentId" = ssa."id"
FROM "SubjectSectionAssignment" ssa
JOIN "Subject" s ON ssa."subjectId" = s."id"
JOIN "_SubjectOld" oa ON 
    CASE
        WHEN oa."code" ~ '-L[A-Z]$' THEN regexp_replace(oa."code", '-L[A-Z]$', '')
        WHEN oa."code" ~ '[A-Z]$' THEN regexp_replace(oa."code", '[A-Z]$', '')
        ELSE oa."code"
    END = s.code
WHERE "Mark"."subjectCode" = oa."code"
  AND "Mark"."classGroup" = oa."classGroup";

-- Update TimetableSlot
ALTER TABLE "TimetableSlot" ADD COLUMN "assignmentId" UUID;
UPDATE "TimetableSlot" 
SET "assignmentId" = ssa."id"
FROM "SubjectSectionAssignment" ssa
JOIN "Subject" s ON ssa."subjectId" = s."id"
JOIN "_SubjectOld" oa ON 
    CASE
        WHEN oa."code" ~ '-L[A-Z]$' THEN regexp_replace(oa."code", '-L[A-Z]$', '')
        WHEN oa."code" ~ '[A-Z]$' THEN regexp_replace(oa."code", '[A-Z]$', '')
        ELSE oa."code"
    END = s.code
WHERE "TimetableSlot"."subjectCode" = oa."code"
  AND "TimetableSlot"."classGroup" = oa."classGroup";

-- Add foreign key constraints for the new assignmentId columns
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SubjectSectionAssignment"("id") ON DELETE SET NULL;
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SubjectSectionAssignment"("id") ON DELETE SET NULL;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SubjectSectionAssignment"("id") ON DELETE SET NULL;

-- Create indexes for the new assignmentId columns
CREATE INDEX "AttendanceSession_assignmentId_idx" ON "AttendanceSession"("assignmentId");
CREATE INDEX "Mark_assignmentId_idx" ON "Mark"("assignmentId");
CREATE INDEX "TimetableSlot_assignmentId_idx" ON "TimetableSlot"("assignmentId");

-- Now we can drop the old columns and tables
-- Drop foreign key constraints that reference the old Subject table
ALTER TABLE "AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_subjectCode_fkey";
ALTER TABLE "Mark" DROP CONSTRAINT IF EXISTS "Mark_subjectCode_fkey";
ALTER TABLE "TimetableSlot" DROP CONSTRAINT IF EXISTS "TimetableSlot_subjectCode_fkey";

-- Drop the old columns
ALTER TABLE "AttendanceSession" DROP COLUMN "subjectCode";
ALTER TABLE "Mark" DROP COLUMN "subjectCode";
ALTER TABLE "TimetableSlot" DROP COLUMN "subjectCode";

-- Drop the old Subject table backup
DROP TABLE "_SubjectOld";

-- Note: The old "Subject" table was already replaced by our new "Subject" table above
-- So we don't need to drop it - we're keeping the new one

-- The User table relations will be handled by Prisma schema update
-- We need to remove the old taughtSubjects and coTaughtSubjects relations
-- and rely on the new theoryAssignments and labAssignments relations
-- This will be handled when we regenerate the Prisma client
