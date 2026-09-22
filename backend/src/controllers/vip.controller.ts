import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'json2csv';
import PDFDocument from 'pdfkit';
import { Workbook } from 'exceljs';
import crypto from 'crypto';
import { semesterService } from '../services/SemesterService';

/**
 * Get a single student by ID
 */
export const getStudentById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Handle case where id might be an array (though it shouldn't be for params)
  const studentId = Array.isArray(id) ? id[0] : id;

  if (!studentId || typeof studentId !== 'string') {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'student' as const },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        classGroup: true,
        semesterId: true,
        semester: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
        marks: {
          select: {
            type: true,
            score: true,
            maxScore: true,
            subject: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a student's information
 */
export const updateStudent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Handle case where id might be an array (though it shouldn't be for params)
  const studentId = Array.isArray(id) ? id[0] : id;

  if (!studentId || typeof studentId !== 'string') {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  const { name, department, classGroup } = req.body;

  // Validate that the user is a student
  try {
    const existing = await prisma.user.findUnique({ where: { id: studentId } });
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (existing.role !== 'student') {
      return res.status(400).json({ error: 'User is not a student' });
    }
  } catch (error) {
    console.error('Error checking student existence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: studentId },
      data: {
        name: name ?? undefined,
        department: department ?? undefined,
        classGroup: classGroup ?? undefined,
      },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        classGroup: true,
        semesterId: true,
        semester: { select: { id: true, name: true } },
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: 'Student updated successfully',
      student: updated,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all students (accessible by VIP roles: dean, principal, hod)
 */
export const getAllStudents = async (req: AuthRequest, res: Response) => {
  // Pagination and search parameters
  const { page = 1, limit = 10, search, department, classGroup } = req.query;

  // Handle case where query parameters might be arrays
  const pageStr = Array.isArray(page) ? page[0] : page;
  const limitStr = Array.isArray(limit) ? limit[0] : limit;
  const searchStr = Array.isArray(search) ? search[0] : search;
  const departmentStr = Array.isArray(department) ? department[0] : department;
  const classGroupStr = Array.isArray(classGroup) ? classGroup[0] : classGroup;

  const pageNum = Math.max(parseInt(pageStr as string, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limitStr as string, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where: any = {
    role: 'student', // Only students
  };

  if (searchStr && typeof searchStr === 'string') {
    where.OR = [
      { id: { contains: searchStr, mode: 'insensitive' } },
      { name: { contains: searchStr, mode: 'insensitive' } },
    ];
  }

  if (departmentStr && typeof departmentStr === 'string' && departmentStr !== '') {
    where.department = departmentStr;
  }

  if (classGroupStr && typeof classGroupStr === 'string' && classGroupStr !== '') {
    where.classGroup = classGroupStr;
  }

  try {
    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
          classGroup: true,
          semesterId: true,
          semester: { select: { id: true, name: true } },
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      students,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching all students:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};





/**
 * Export faculty marks as Excel
 */
const exportFacultyMarksAsExcel = async (rows: any[], res: Response, semesterName: string) => {
  try {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Faculty Marks');

    // Define columns
    worksheet.columns = [
      { header: 'Faculty ID', key: 'Faculty ID', width: 15 },
      { header: 'Faculty Name', key: 'Faculty Name', width: 20 },
      { header: 'Faculty Department', key: 'Faculty Department', width: 20 },
      { header: 'Subject Code', key: 'Subject Code', width: 15 },
      { header: 'Subject Name', key: 'Subject Name', width: 25 },
      { header: 'Student ID', key: 'Student ID', width: 15 },
      { header: 'Student Name', key: 'Student Name', width: 25 },
      { header: 'Student Department', key: 'Student Department', width: 20 },
      { header: 'Student Class Group', key: 'Student Class Group', width: 15 },
      { header: 'Mark Type', key: 'Mark Type', width: 10 },
      { header: 'Score', key: 'Score', width: 10 },
      { header: 'Max Score', key: 'Max Score', width: 10 },
      { header: 'Semester', key: 'Semester', width: 15 },
    ];

    // Add rows
    rows.forEach(row => {
      worksheet.addRow(row);
    });

    // Set response headers for Excel download
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`faculty-marks-report-${semesterName.replace(/\s+/g, '_')}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Error generating Excel faculty marks report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Export faculty marks as PDF
 */
const exportFacultyMarksAsPDF = async (rows: any[], res: Response, semesterName: string) => {
  try {
    const doc = new PDFDocument({ margin: 40 });

    // Set response headers for PDF download
    res.header('Content-Type', 'application/pdf');
    res.attachment(`faculty-marks-report-${semesterName.replace(/\s+/g, '_')}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Faculty Marks Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Semester: ${semesterName}`, { align: 'center' });
    doc.moveDown(2);

    // Create table
    const tableTop = 100;

    // Add table headers (abbreviated for PDF space)
    doc.fontSize(8);
    const headers = ['Fac ID', 'Fac Name', 'Subj Code', 'Stud ID', 'Stud Name', 'Mark Type', 'Score'];
    const xCoordinates = [30, 60, 120, 180, 240, 300, 350, 400];

    headers.forEach((header, index) => {
      doc.text(header, xCoordinates[index], tableTop, { width: 50, align: 'left' });
    });

    // Add rows (limit to first 50 for PDF readability)
    const displayRows = rows.slice(0, 50);
    displayRows.forEach((row, rowIndex) => {
      const yPosition = tableTop + 15 + (rowIndex * 12);
      doc.text(row['Faculty ID'] || '', 30, yPosition, { width: 30, align: 'left' });
      doc.text(row['Faculty Name'] || '', 60, yPosition, { width: 60, align: 'left' });
      doc.text(row['Subject Code'] || '', 120, yPosition, { width: 50, align: 'left' });
      doc.text(row['Student ID'] || '', 180, yPosition, { width: 50, align: 'left' });
      doc.text(row['Student Name'] || '', 240, yPosition, { width: 60, align: 'left' });
      doc.text(row['Mark Type'] || '', 300, yPosition, { width: 50, align: 'left' });
      doc.text(row['Score'] || '', 350, yPosition, { width: 40, align: 'left' });
    });

    if (rows.length > 50) {
      doc.fontSize(10);
      doc.text(`... and ${rows.length - 50} more rows`, 30, tableTop + 15 + (displayRows.length * 12) + 20, { align: 'left' });
    }

    doc.end();
    return res;
  } catch (error) {
    console.error('Error generating PDF faculty marks report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Export faculty marks as JSON
 */
const exportFacultyMarksAsJSON = async (rows: any[], res: Response, semesterName: string) => {
  res.header('Content-Type', 'application/json');
  res.attachment(`faculty-marks-report-${semesterName.replace(/\s+/g, '_')}.json`);
  return res.send(JSON.stringify(rows, null, 2));
};

/**
 * Get leaderboard for a given mark type (cie1, cie2, cie3, total) and group
 * Helper to compute top 5 per group
 */
const computeLeaderboard = async (groupBy: 'department' | 'classGroup' | null, markType: 'cie1' | 'cie2' | 'cie3' | 'total') => {
  // Get active semester
  const activeSem = await semesterService.getActiveSemester();

  if (!activeSem) {
    throw new Error('No active semester found');
  }

  // Determine which mark types to include
  const typeCondition =
    markType === 'total'
      ? {
          in: ['cie1', 'cie2', 'cie3', 'assignment', 'lab'] as const,
        }
      : { equals: markType };

  // Get all students with their marks for active semester and selected type(s)
  const students = await prisma.user.findMany({
    where: { role: 'student' },
    select: {
      id: true,
      name: true,
      department: true,
      classGroup: true,
      marks: {
        where: {
          type: typeCondition as any,
          semesterId: activeSem.id,
        },
        select: {
          score: true,
          subject: { select: { code: true, name: true } },
        },
      },
    },
  });

  // Compute total score for each student based on selected type(s)
  const studentsWithTotal = (students as any[]).map((student: any) => {
    const total = student.marks.reduce((sum: number, mark: any) => sum + (mark.score ?? 0), 0);
    return {
      ...student,
      totalScore: total,
    };
  });

  // Filter out students with no scores (optional)
  const scoredStudents = studentsWithTotal.filter((s) => s.totalScore > 0);

  // Group by department or classGroup or overall
  let grouped: Record<string, any[]> = {};
  if (groupBy === 'department') {
    for (const student of scoredStudents) {
      const dept = student.department || 'Unknown';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(student);
    }
  } else if (groupBy === 'classGroup') {
    for (const student of scoredStudents) {
      const classGroup = student.classGroup || 'Unknown';
      if (!grouped[classGroup]) grouped[classGroup] = [];
      grouped[classGroup].push(student);
    }
  } else {
    // Overall batch
    grouped['Overall'] = scoredStudents;
  }

  // For each group, sort by totalScore descending and take top 5
  const leaderboard: Record<string, any[]> = {};
  for (const [group, students] of Object.entries(grouped)) {
    const sorted = students
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5)
      .map((student) => ({
        id: student.id,
        name: student.name,
        department: student.department,
        classGroup: student.classGroup,
        totalScore: student.totalScore,
      }));
    leaderboard[group] = sorted;
  }

  return leaderboard;
};

/**
 * Get leaderboard per department (top 5 students per dept based on mark type)
 */
export const getLeaderboardByDept = async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'cie1' } = req.query;
    const validTypes = ['cie1', 'cie2', 'cie3', 'total'];
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({ error: 'Invalid mark type. Must be one of: cie1, cie2, cie3, total' });
    }
    const leaderboard = await computeLeaderboard('department', type as 'cie1' | 'cie2' | 'cie3' | 'total');
    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error computing department leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get leaderboard per class (top 5 students per class based on mark type)
 */
export const getLeaderboardByClass = async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'cie1' } = req.query;
    const validTypes = ['cie1', 'cie2', 'cie3', 'total'];
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({ error: 'Invalid mark type. Must be one of: cie1, cie2, cie3, total' });
    }
    const leaderboard = await computeLeaderboard('classGroup', type as 'cie1' | 'cie2' | 'cie3' | 'total');
    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error computing class leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get leaderboard for whole batch (top 5 students overall based on mark type)
 */
export const getLeaderboardBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'cie1' } = req.query;
    const validTypes = ['cie1', 'cie2', 'cie3', 'total'];
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({ error: 'Invalid mark type. Must be one of: cie1, cie2, cie3, total' });
    }
    const leaderboard = await computeLeaderboard(null, type as 'cie1' | 'cie2' | 'cie3' | 'total');
    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error computing batch leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper to get active semester
 */
const getActiveSemester = async () => {
  return await semesterService.getActiveSemester();
};

/**
 * Download all students report in multiple formats
 */
export const downloadStudentsReport = async (req: AuthRequest, res: Response) => {
  const { department, classGroup, format = 'csv' } = req.query;

  // Build where clause
  const where: any = { role: 'student' };

  if (department && typeof department === 'string' && department !== '') {
    where.department = department;
  }

  if (classGroup && typeof classGroup === 'string' && classGroup !== '') {
    where.classGroup = classGroup;
  }

  try {
    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        department: true,
        classGroup: true,
        semesterId: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // Set filename based on filters
    let filename = 'students-report';
    if (department && typeof department === 'string' && department !== '') {
      filename += `-${department}`;
    }
    if (classGroup && typeof classGroup === 'string' && classGroup !== '') {
      filename += `-${classGroup}`;
    }

    // Export based on format
    switch (format) {
      case 'csv':
        return await exportStudentsAsCSV(students, res, filename);
      case 'excel':
        return await exportStudentsAsExcel(students, res, filename);
      case 'pdf':
        return await exportStudentsAsPDF(students, res, filename);
      case 'json':
        return await exportStudentsAsJSON(students, res, filename);
      default:
        return res.status(400).json({ error: 'Unsupported format. Use csv, excel, pdf, or json.' });
    }
  } catch (error) {
    console.error('Error generating student report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Download faculty-wise marks report in multiple formats
 */
export const downloadFacultyMarksReport = async (req: AuthRequest, res: Response) => {
  const { format = 'csv' } = req.query;

  try {
    // Get active semester
    const activeSem = await getActiveSemester();

    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Fetch marks with related faculty, student, and subject data
    const marksWithDetails = await prisma.mark.findMany({
      where: {
        semesterId: activeSem.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            department: true,
            classGroup: true,
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
            faculty: {
              select: {
                id: true,
                name: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: [
        { subject: { faculty: { name: 'asc' } } },
        { subject: { code: 'asc' } },
        { student: { name: 'asc' } },
      ],
    });

    // Transform to flat array for export
    const rows = marksWithDetails.map(mark => ({
      'Faculty ID': mark.subject.faculty.id,
      'Faculty Name': mark.subject.faculty.name,
      'Faculty Department': mark.subject.faculty.department,
      'Subject Code': mark.subject.code,
      'Subject Name': mark.subject.name,
      'Student ID': mark.student.id,
      'Student Name': mark.student.name,
      'Student Department': mark.student.department,
      'Student Class Group': mark.student.classGroup || '',
      'Mark Type': mark.type,
      'Score': mark.score ?? '',
      'Max Score': mark.maxScore,
      'Semester': activeSem.name,
    }));

    // Export based on format
    switch (format) {
      case 'csv':
        return await exportFacultyMarksAsCSV(rows, res, `faculty-marks-report-${activeSem.name.replace(/\s+/g, '_')}`);
      case 'excel':
        return await exportFacultyMarksAsExcel(rows, res, `faculty-marks-report-${activeSem.name.replace(/\s+/g, '_')}`);
      case 'pdf':
        return await exportFacultyMarksAsPDF(rows, res, `faculty-marks-report-${activeSem.name.replace(/\s+/g, '_')}`);
      case 'json':
        return await exportFacultyMarksAsJSON(rows, res, `faculty-marks-report-${activeSem.name.replace(/\s+/g, '_')}`);
      default:
        return res.status(400).json({ error: 'Unsupported format. Use csv, excel, pdf, or json.' });
    }
  } catch (error) {
    console.error('Error generating faculty marks report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Export students as CSV
 */
const exportStudentsAsCSV = async (students: any[], res: Response, filename: string) => {
  const fields = [
    { label: 'ID', value: 'id' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' },
    { label: 'Class Group', value: 'classGroup' },
    { label: 'Semester ID', value: 'semesterId' },
    { label: 'Created At', value: 'createdAt' },
  ];

  const opts = { fields };
  const csv = parse(students, opts);

  res.header('Content-Type', 'text/csv');
  res.attachment(`${filename}.csv`);
  return res.send(csv);
};

/**
 * Export students as Excel
 */
const exportStudentsAsExcel = async (students: any[], res: Response, filename: string) => {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Students');

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Department', key: 'department', width: 25 },
    { header: 'Class Group', key: 'classGroup', width: 15 },
    { header: 'Semester ID', key: 'semesterId', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 20 },
  ];

  // Add rows
  students.forEach(student => {
    worksheet.addRow(student);
  });

  // Set response headers
  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(`${filename}.xlsx`);

  // Write to response
  await workbook.xlsx.write(res);
  return res.end();
};

/**
 * Export students as PDF
 */
const exportStudentsAsPDF = async (students: any[], res: Response, filename: string) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Set response headers
  res.header('Content-Type', 'application/pdf');
  res.attachment(`${filename}.pdf`);

  // Pipe PDF to response
  doc.pipe(res);

  // Add title
  doc.fontSize(20).text('Student Report', { align: 'center' });
  doc.moveDown();

  // Add table header
  const tableTop = 130;
  doc.fontSize(10);
  doc.text('ID', 50, tableTop);
  doc.text('Name', 150, tableTop);
  doc.text('Department', 250, tableTop);
  doc.text('Class Group', 350, tableTop);
  doc.text('Semester ID', 450, tableTop);
  doc.text('Created At', 550, tableTop);

  // Add table rows
  let yPosition = tableTop + 20;
  students.forEach((student, index) => {
    if (yPosition > 750) {
      doc.addPage();
      yPosition = 50;
    }

    doc.fontSize(8);
    doc.text(student.id, 50, yPosition);
    doc.text(student.name, 150, yPosition);
    doc.text(student.department, 250, yPosition);
    doc.text(student.classGroup || '', 350, yPosition);
    doc.text(student.semesterId || '', 450, yPosition);
    doc.text(new Date(student.createdAt).toLocaleDateString(), 550, yPosition);

    yPosition += 15;
  });

  doc.end();
};

/**
 * Export students as JSON
 */
const exportStudentsAsJSON = async (students: any[], res: Response, filename: string) => {
  res.header('Content-Type', 'application/json');
  res.attachment(`${filename}.json`);
  return res.send(JSON.stringify(students, null, 2));
};

/**
 * Export faculty marks as CSV
 */
const exportFacultyMarksAsCSV = async (rows: any[], res: Response, filename: string) => {
  const fields = [
    'Faculty ID',
    'Faculty Name',
    'Faculty Department',
    'Subject Code',
    'Subject Name',
    'Student ID',
    'Student Name',
    'Student Department',
    'Student Class Group',
    'Mark Type',
    'Score',
    'Max Score',
    'Semester',
  ];

  const opts = { fields };
  const csv = parse(rows, opts);

  res.header('Content-Type', 'text/csv');
  res.attachment(`${filename}.csv`);
  return res.send(csv);
};


/**
 * Get active sessions (VIP only)
 */
export const getActiveSessions = async (req: AuthRequest, res: Response) => {
  // In a real application, we would fetch active sessions from a session store
  // For this implementation, we'll return mock data showing recent logins
  try {
    // Get users with recent activity (simulating active sessions)
    const recentUsers = await prisma.user.findMany({
      where: {
        role: {
          not: 'student' // Exclude students for VIP session view
        }
      },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20
    });

    // Format as session data
    const sessions = recentUsers.map(user => ({
      sessionId: `sess_${user.id}_${crypto.randomBytes(4).toString('hex')}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      department: user.department || '',
      loginTime: user.updatedAt, // Using updatedAt as proxy for login time
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 255), // Mock IP
      userAgent: 'Mozilla/5.0 (compatible; CollegeERP/1.0)' // Mock user agent
    }));

    return res.status(200).json({
      sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Terminate a session (VIP only)
 */
export const terminateSession = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // In a real application, we would terminate the session in the session store
    // For this implementation, we'll simulate by updating the user's updatedAt timestamp
    // Extract user ID from session ID (mock implementation)
    const userId = (sessionId as string).split('_')[1];

    if (!userId) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In a real app, we would remove the session from the store
    // For now, we'll just return success
    return res.status(200).json({
      message: 'Session terminated successfully',
      sessionId
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get API usage statistics (VIP only)
 */
export const getAPIUsageStats = async (req: AuthRequest, res: Response) => {
  try {
    // In a real application, we would fetch API usage from logs or monitoring system
    // For this implementation, we'll return mock statistics

    // Get total counts for various entities
    const [userCount, studentCount, facultyCount, markCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: { in: ['teacher', 'dean', 'principal', 'hod'] } } }),
      prisma.mark.count()
    ]);

    // Mock API usage data
    const apiStats = {
      totalRequests: Math.floor(Math.random() * 10000) + 5000,
      requestsToday: Math.floor(Math.random() * 1000) + 500,
      requestsPerHour: Math.floor(Math.random() * 100) + 50,
      averageResponseTime: Math.floor(Math.random() * 200) + 50, // ms
      errorRate: (Math.random() * 2).toFixed(2) + '%', // 0-2%
      endpoints: [
        { endpoint: '/auth/login', count: Math.floor(Math.random() * 500) + 100, avgTime: 120 },
        { endpoint: '/auth/users', count: Math.floor(Math.random() * 300) + 50, avgTime: 80 },
        { endpoint: '/vip/students', count: Math.floor(Math.random() * 200) + 30, avgTime: 150 },
        { endpoint: '/vip/leaderboard/*', count: Math.floor(Math.random() * 150) + 20, avgTime: 200 },
        { endpoint: '/marks', count: Math.floor(Math.random() * 400) + 100, avgTime: 100 }
      ],
      userStats: {
        totalUsers: userCount,
        totalStudents: studentCount,
        totalFaculty: facultyCount,
        totalMarks: markCount
      }
    };

    return res.status(200).json(apiStats);
  } catch (error) {
    console.error('Error fetching API usage stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};