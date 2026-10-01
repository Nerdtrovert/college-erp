-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "semesterNumber" INTEGER NOT NULL,
    "program" TEXT NOT NULL,
    "classGroup" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentId_semesterId_key" ON "StudentEnrollment"("studentId", "semesterId");
CREATE INDEX "StudentEnrollment_semesterId_semesterNumber_idx" ON "StudentEnrollment"("semesterId", "semesterNumber");
CREATE INDEX "StudentEnrollment_semesterId_program_idx" ON "StudentEnrollment"("semesterId", "program");
CREATE INDEX "StudentEnrollment_semesterId_classGroup_idx" ON "StudentEnrollment"("semesterId", "classGroup");
CREATE INDEX "StudentEnrollment_studentId_idx" ON "StudentEnrollment"("studentId");

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
