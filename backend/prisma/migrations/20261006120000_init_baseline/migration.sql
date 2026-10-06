-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'teacher', 'dean', 'principal', 'hod');

-- CreateEnum
CREATE TYPE "SemesterStatus" AS ENUM ('ACTIVE', 'UPCOMING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('STANDALONE', 'INTEGRATED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "department" TEXT,
    "classGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "semesterId" UUID,
    "backlogSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "numberOfBacklogs" INTEGER NOT NULL DEFAULT 0,
    "program" TEXT,
    "batchEndYear" INTEGER,
    "batchStartYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SubjectType" NOT NULL DEFAULT 'STANDALONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "description" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "SubjectSectionAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subjectId" UUID NOT NULL,
    "theoryFacultyId" UUID,
    "labFacultyId" UUID,
    "classGroup" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectSectionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "status" "SemesterStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "semesterNumber" INTEGER NOT NULL,
    "program" TEXT NOT NULL,
    "classGroup" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" TEXT NOT NULL,
    "classGroup" TEXT NOT NULL,
    "semesterId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "startTime" TEXT NOT NULL,
    "assignmentId" UUID,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "semesterId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assign1Submitted" BOOLEAN NOT NULL DEFAULT false,
    "assign2Submitted" BOOLEAN NOT NULL DEFAULT false,
    "assignmentId" UUID,

    CONSTRAINT "Mark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "authorId" UUID NOT NULL,
    "target" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "room" TEXT,
    "classGroup" TEXT NOT NULL,
    "subjectCode" TEXT,
    "teacherId" TEXT NOT NULL,
    "semesterId" UUID NOT NULL,
    "batchYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coTeacherId" TEXT,
    "assignmentId" UUID,
    "activityType" TEXT,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUpload" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SubjectOld" (
    "code" TEXT,
    "name" TEXT,
    "facultyId" TEXT,
    "classGroup" TEXT,
    "type" "SubjectType",
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "coFacultyId" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_classGroup_idx" ON "User"("classGroup");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_role_classGroup_idx" ON "User"("role", "classGroup");

-- CreateIndex
CREATE INDEX "User_role_program_idx" ON "User"("role", "program");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_id_key" ON "Subject"("id");

-- CreateIndex
CREATE INDEX "SubjectSectionAssignment_labFacultyId_idx" ON "SubjectSectionAssignment"("labFacultyId");

-- CreateIndex
CREATE INDEX "SubjectSectionAssignment_subjectId_idx" ON "SubjectSectionAssignment"("subjectId");

-- CreateIndex
CREATE INDEX "SubjectSectionAssignment_theoryFacultyId_idx" ON "SubjectSectionAssignment"("theoryFacultyId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectSectionAssignment_subjectId_classGroup_key" ON "SubjectSectionAssignment"("subjectId", "classGroup");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_code_key" ON "Semester"("code");

-- CreateIndex
CREATE INDEX "Semester_status_idx" ON "Semester"("status");

-- CreateIndex
CREATE INDEX "StudentEnrollment_semesterId_semesterNumber_idx" ON "StudentEnrollment"("semesterId", "semesterNumber");

-- CreateIndex
CREATE INDEX "StudentEnrollment_semesterId_program_idx" ON "StudentEnrollment"("semesterId", "program");

-- CreateIndex
CREATE INDEX "StudentEnrollment_semesterId_classGroup_idx" ON "StudentEnrollment"("semesterId", "classGroup");

-- CreateIndex
CREATE INDEX "StudentEnrollment_studentId_idx" ON "StudentEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentId_semesterId_key" ON "StudentEnrollment"("studentId", "semesterId");

-- CreateIndex
CREATE INDEX "AttendanceSession_date_semesterId_idx" ON "AttendanceSession"("date", "semesterId");

-- CreateIndex
CREATE INDEX "AttendanceSession_assignmentId_idx" ON "AttendanceSession"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_assignmentId_date_classGroup_semesterId_s_key" ON "AttendanceSession"("assignmentId", "date", "classGroup", "semesterId", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "Mark_studentId_semesterId_idx" ON "Mark"("studentId", "semesterId");

-- CreateIndex
CREATE INDEX "Mark_assignmentId_idx" ON "Mark"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Mark_studentId_assignmentId_type_semesterId_key" ON "Mark"("studentId", "assignmentId", "type", "semesterId");

-- CreateIndex
CREATE INDEX "TimetableSlot_teacherId_semesterId_idx" ON "TimetableSlot"("teacherId", "semesterId");

-- CreateIndex
CREATE INDEX "TimetableSlot_classGroup_semesterId_idx" ON "TimetableSlot"("classGroup", "semesterId");

-- CreateIndex
CREATE INDEX "TimetableSlot_coTeacherId_idx" ON "TimetableSlot"("coTeacherId");

-- CreateIndex
CREATE INDEX "TimetableSlot_assignmentId_idx" ON "TimetableSlot"("assignmentId");

-- CreateIndex
CREATE INDEX "TimetableSlot_batchYear_idx" ON "TimetableSlot"("batchYear");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_classGroup_day_slotIndex_semesterId_batchYear_key" ON "TimetableSlot"("classGroup", "day", "slotIndex", "semesterId", "batchYear");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectSectionAssignment" ADD CONSTRAINT "SubjectSectionAssignment_labFacultyId_fkey" FOREIGN KEY ("labFacultyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectSectionAssignment" ADD CONSTRAINT "SubjectSectionAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectSectionAssignment" ADD CONSTRAINT "SubjectSectionAssignment_theoryFacultyId_fkey" FOREIGN KEY ("theoryFacultyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SubjectSectionAssignment"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SubjectSectionAssignment"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SubjectSectionAssignment"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUpload" ADD CONSTRAINT "AdminUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
