import { Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

export const getStudentMarks = async (req: AuthRequest, res: Response) => {
  const studentId = req.user?.id;
  const classGroup = req.user?.classGroup;

  if (!studentId || !classGroup) {
    return res.status(400).json({ error: 'Invalid credentials or missing class section group context' });
  }

  try {
    // Get active semester
    const activeSem = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Find all subjects for this student's class group in the active semester
    const subjects = await prisma.subject.findMany({
      where: { classGroup },
      include: {
        faculty: { select: { name: true } },
        marks: {
          where: {
            studentId,
            semesterId: activeSem.id,
          },
        },
      },
    });

    // Map into the format expected by StudentMarks.tsx
    const marksData = subjects.map((sub) => {
      // Helper to calculate best 2 average of CIEs and scale
      const getCieScore = () => {
        const c1 = sub.marks.find((m) => m.type === 'cie1')?.score;
        const c2 = sub.marks.find((m) => m.type === 'cie2')?.score;
        const c3 = sub.marks.find((m) => m.type === 'cie3')?.score;

        const scores = [c1, c2, c3].filter((s): s is number => s !== undefined && s !== null);
        if (scores.length === 0) return null;

        // Best 2 average
        scores.sort((a, b) => b - a);
        const best = scores.slice(0, 2);
        const avg = best.reduce((sum, val) => sum + val, 0) / best.length;

        // Scale based on subject type (Standalone to 25, Integrated to 15)
        const scaleFactor = sub.type === 'STANDALONE' ? 0.5 : 0.3;
        const scaled = avg * scaleFactor;
        return Math.round(scaled * 10) / 10;
      };

      // Helper to calculate assignment score
      const getAssignmentScore = () => {
        if (sub.type === 'STANDALONE') {
          const a = sub.marks.find((m) => m.type === 'assignment')?.score;
          return a !== undefined ? a : null;
        } else {
          // Integrated: average of assignment1 and assignment2
          const a1 = sub.marks.find((m) => m.type === 'assignment1')?.score;
          const a2 = sub.marks.find((m) => m.type === 'assignment2')?.score;
          
          const scores = [a1, a2].filter((s): s is number => s !== undefined && s !== null);
          if (scores.length === 0) return null;
          const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
          return Math.round(avg * 10) / 10;
        }
      };

      const getLabScore = () => {
        if (sub.type === 'STANDALONE') return null;
        const l = sub.marks.find((m) => m.type === 'lab')?.score;
        return l !== undefined ? l : null;
      };

      const cieScore = getCieScore();
      const assignmentScore = getAssignmentScore();
      const labScore = getLabScore();

      const isStandalone = sub.type === 'STANDALONE';

      return {
        name: sub.name,
        code: sub.code,
        faculty: sub.faculty.name,
        type: sub.type,
        assessments: [
          { name: 'CIE', marks: cieScore, max: isStandalone ? 25 : 15 },
          { name: 'Assignment', marks: assignmentScore, max: isStandalone ? 25 : 10 },
          { name: 'Lab', marks: labScore, max: isStandalone ? 0 : 25 }
        ],
      };
    });

    return res.status(200).json(marksData);
  } catch (error) {
    console.error('Error fetching student marks:', error);
    return res.status(500).json({ error: 'Internal server error during marks list retrieval' });
  }
};

export const getTeacherMarks = async (req: AuthRequest, res: Response) => {
  const { subjectCode, assessmentType } = req.params as { subjectCode: string; assessmentType: string };

  try {
    const subject = await prisma.subject.findUnique({
      where: { code: subjectCode },
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject code not found' });
    }

    // Get active semester
    const activeSem = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Get all students inside this class group section
    const students = await prisma.user.findMany({
      where: { role: 'student', classGroup: subject.classGroup },
      orderBy: { id: 'asc' },
    });

    // Get marks records matching the subject, type, student, and active semester
    const marks = await prisma.mark.findMany({
      where: {
        subjectCode,
        type: assessmentType,
        semesterId: activeSem.id,
      },
    });

    const marksMap = Object.fromEntries(marks.map((m) => [m.studentId, m.score]));

    const studentMarksList = students.map((stud) => ({
      roll: stud.id,
      name: stud.name,
      score: marksMap[stud.id] !== undefined ? marksMap[stud.id] : null,
    }));

    return res.status(200).json({
      subjectCode,
      classGroup: subject.classGroup,
      assessmentType,
      students: studentMarksList,
    });
  } catch (error) {
    console.error('Error fetching teacher marks registry view:', error);
    return res.status(500).json({ error: 'Internal server error during marks repository fetch' });
  }
};

export const exportTeacherMarks = async (req: AuthRequest, res: Response) => {
  const { subjectCode, assessmentType } = req.params as { subjectCode: string; assessmentType: string };

  try {
    const subject = await prisma.subject.findUnique({
      where: { code: subjectCode },
      select: { code: true, name: true, classGroup: true },
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject code not found' });
    }

    const activeSem = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    const [students, marks] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'student', classGroup: subject.classGroup },
        orderBy: { id: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.mark.findMany({
        where: {
          subjectCode,
          type: assessmentType,
          semesterId: activeSem.id,
        },
        select: { studentId: true, score: true },
      }),
    ]);

    const marksMap = new Map(marks.map(mark => [mark.studentId, mark.score]));
    const assessmentLabel = assessmentType
      .replace(/(\d+)/, '-$1')
      .replace(/^./, character => character.toUpperCase());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${subject.code}-${assessmentType}-marks.pdf"`,
    );

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Internal Marks', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`${subject.code} - ${subject.name}`, { align: 'center' });
    doc.text(`Class: ${subject.classGroup}    Assessment: ${assessmentLabel}`, { align: 'center' });
    doc.moveDown(1.5);

    const columns = [
      { label: 'USN', x: 48, width: 150 },
      { label: 'Name', x: 198, width: 260 },
      { label: 'Marks', x: 458, width: 90 },
    ];
    const rowHeight = 24;
    const drawHeader = () => {
      const top = doc.y;
      doc.save().fillColor('#1d4ed8').rect(48, top, 500, rowHeight).fill().restore();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('white');
      columns.forEach(column => doc.text(column.label, column.x + 8, top + 7, { width: column.width - 16 }));
      doc.y = top + rowHeight;
    };
    const drawRow = (student: { id: string; name: string }, score: number | null) => {
      if (doc.y + rowHeight > doc.page.height - 48) {
        doc.addPage();
        drawHeader();
      }

      const top = doc.y;
      if (students.indexOf(student) % 2 === 0) {
        doc.save().fillColor('#eff6ff').rect(48, top, 500, rowHeight).fill().restore();
      }
      doc.font('Helvetica').fontSize(10).fillColor('#111827');
      doc.text(student.id, 56, top + 7, { width: 134, ellipsis: true });
      doc.text(student.name, 206, top + 7, { width: 244, ellipsis: true });
      doc.text(score === null ? '—' : String(score), 466, top + 7, { width: 74, align: 'right' });
      doc.y = top + rowHeight;
    };

    drawHeader();
    students.forEach(student => drawRow(student, marksMap.get(student.id) ?? null));
    doc.end();
  } catch (error) {
    console.error('Error exporting teacher marks PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error while exporting marks' });
    }
    res.end();
  }
};

export const saveTeacherMarks = async (req: AuthRequest, res: Response) => {
  const { subjectCode, type, maxScore, records } = req.body;

  try {
    // Verify subject exists
    const subject = await prisma.subject.findUnique({ where: { code: subjectCode } });
    if (!subject) {
      return res.status(404).json({ error: 'Subject code not found' });
    }

    // Get active semester
    const activeSem = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Bulk upsert using transaction
    await prisma.$transaction(
      records.map((rec: { studentId: string; score: number | null }) =>
        prisma.mark.upsert({
          where: {
            studentId_subjectCode_type_semesterId: {
              studentId: rec.studentId,
              subjectCode,
              type,
              semesterId: activeSem.id,
            },
          },
          update: {
            score: rec.score,
            maxScore,
          },
          create: {
            studentId: rec.studentId,
            subjectCode,
            type,
            score: rec.score,
            maxScore,
            semesterId: activeSem.id,
          },
        })
      )
    );

    return res.status(200).json({ message: 'Internal marks saved successfully' });
  } catch (error) {
    console.error('Error saving teacher internal marks:', error);
    return res.status(500).json({ error: 'Internal server error while saving internal marks' });
  }
};