ALTER TABLE "TimetableSlot" ADD COLUMN "subjectCode" TEXT;

UPDATE "TimetableSlot" AS slot
SET "subjectCode" = subject."code"
FROM "SubjectSectionAssignment" AS assignment
JOIN "Subject" AS subject ON subject."id" = assignment."subjectId"
WHERE slot."assignmentId" = assignment."id";

CREATE OR REPLACE FUNCTION set_timetable_slot_subject_code() RETURNS trigger AS $$
BEGIN
  IF NEW."assignmentId" IS NOT NULL AND (NEW."subjectCode" IS NULL OR NEW."subjectCode" = '') THEN
    SELECT subject."code" INTO NEW."subjectCode"
    FROM "SubjectSectionAssignment" AS assignment
    JOIN "Subject" AS subject ON subject."id" = assignment."subjectId"
    WHERE assignment."id" = NEW."assignmentId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TimetableSlot_subjectCode_from_assignment"
BEFORE INSERT OR UPDATE OF "assignmentId" ON "TimetableSlot"
FOR EACH ROW EXECUTE FUNCTION set_timetable_slot_subject_code();
