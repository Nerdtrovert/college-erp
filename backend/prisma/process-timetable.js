// Read the original timetable array
const timetable = [
  // CSE-A Timetable (Room B 006)
  // Monday
  { day: 'Monday', slotIndex: 0, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in' },
  { day: 'Monday', slotIndex: 1, subjectCode: 'BCS501', classGroup: 'CSE-A', room: 'B 006', teacherId: 'madhumathi@hnnce.in' },
  { day: 'Monday', slotIndex: 3, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in' },
  { day: 'Monday', slotIndex: 4, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in' },

  // Tuesday
  { day: 'Tuesday', slotIndex: 0, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in' },
  { day: 'Tuesday', slotIndex: 1, subjectCode: 'BCS508', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in' },
  { day: 'Tuesday', slotIndex: 3, subjectCode: 'BCS501', classGroup: 'CSE-A', room: 'B 006', teacherId: 'madhumathi@hnnce.in' },
  { day: 'Tuesday', slotIndex: 4, subjectCode: 'BCS515B', classGroup: 'CSE-A', room: 'B 006', teacherId: 'rajesh@hnnce.in' },
  { day: 'Tuesday', slotIndex: 6, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in' }, // TUTO
  { day: 'Tuesday', slotIndex: 7, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in' }, // TUTO

  // Wednesday
  { day: 'Wednesday', slotIndex: 0, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in' },
  { day: 'Wednesday', slotIndex: 1, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in' },
  { day: 'Wednesday', slotIndex: 3, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in' },
  { day: 'Wednesday', slotIndex: 4, subjectCode: 'BCS508', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in' },
  { day: 'Wednesday', slotIndex: 6, subjectCode: 'BCSL504', classGroup: 'CSE-A', room: 'B 006', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in' },
  { day: 'Wednesday', slotIndex: 7, subjectCode: 'BCSL504', classGroup: 'CSE-A', room: 'B 006', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in' },

  // Thursday
  { day: 'Thursday', slotIndex: 0, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in' }, // TUTO
  { day: 'Thursday', slotIndex: 1, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in' }, // TUTO
  { day: 'Thursday', slotIndex: 3, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in' },
  { day: 'Thursday', slotIndex: 4, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in' },
  { day: 'Thursday', slotIndex: 6, subjectCode: 'BIS586', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in' },
  { day: 'Thursday', slotIndex: 7, subjectCode: 'BIS586', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in' },

  // Friday
  { day: 'Friday', slotIndex: 0, subjectCode: 'BCS501', classGroup: 'CSE-A', room: 'B 006', teacherId: 'madhumathi@hnnce.in' },
  { day: 'Friday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-A', room: 'B 006', teacherId: 'rajesh@hnnce.in' },
  { day: 'Friday', slotIndex: 3, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in' },
  { day: 'Friday', slotIndex: 4, subjectCode: 'BCS515B', classGroup: 'CSE-A', room: 'B 006', teacherId: 'rajesh@hnnce.in' },
  { day: 'Friday', slotIndex: 6, subjectCode: 'MC', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in' },
  { day: 'Friday', slotIndex: 7, subjectCode: 'MC', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in' },

  // CSE-B Timetable (Room B 001)
  // Monday
  { day: 'Monday', slotIndex: 0, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in' },
  { day: 'Monday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in' },
  { day: 'Monday', slotIndex: 3, subjectCode: 'BCS508', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in' },
  { day: 'Monday', slotIndex: 4, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in' },
  { day: 'Monday', slotIndex: 6, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in' }, // TUTO
  { day: 'Monday', slotIndex: 7, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in' }, // TUTO

  // Tuesday
  { day: 'Tuesday', slotIndex: 0, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in' }, // TUTO
  { day: 'Tuesday', slotIndex: 1, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in' }, // TUTO
  { day: 'Tuesday', slotIndex: 3, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in' },
  { day: 'Tuesday', slotIndex: 4, subjectCode: 'BCS508', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in' },

  // Wednesday
  { day: 'Wednesday', slotIndex: 0, subjectCode: 'BIS586', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in' },
  { day: 'Wednesday', slotIndex: 1, subjectCode: 'BIS586', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in' },
  { day: 'Wednesday', slotIndex: 3, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in' },
  { day: 'Wednesday', slotIndex: 4, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in' },
  { day: 'Wednesday', slotIndex: 6, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in' },
  { day: 'Wednesday', slotIndex: 7, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in' },

  // Thursday
  { day: 'Thursday', slotIndex: 0, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in' },
  { day: 'Thursday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in' },
  { day: 'Thursday', slotIndex: 3, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in' },
  { day: 'Thursday', slotIndex: 4, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in' },
  { day: 'Thursday', slotIndex: 6, subjectCode: 'BCSL504', classGroup: 'CSE-B', room: 'B 001', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in' },
  { day: 'Thursday', slotIndex: 7, subjectCode: 'BCSL504', classGroup: 'CSE-B', room: 'B 001', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in' },

  // Friday
  { day: 'Friday', slotIndex: 0, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in' },
  { day: 'Friday', slotIndex: 1, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in' },
  { day: 'Friday', slotIndex: 3, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in' },
  { day: 'Friday', slotIndex: 4, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in' },
  { day: 'Friday', slotIndex: 6, subjectCode: 'MC', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in' },
  { day: 'Friday', slotIndex: 7, subjectCode: 'MC', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in' },
];

// Function to determine activityType based on rules
function getActivityType(entry) {
  const { subjectCode, coTeacherId, slotIndex } = entry;

  // Rule 1: BCSL504 -> LAB
  if (subjectCode === 'BCSL504') {
    return 'LAB';
  }

  // Rule 2: BCS502 -> LAB if coTeacherId exists, else THEORY
  if (subjectCode === 'BCS502') {
    return coTeacherId !== null && coTeacherId !== undefined ? 'LAB' : 'THEORY';
  }

  // Rule 3: BCS503 or BRMK557 with slotIndex 6 or 7 -> TUTORIAL
  if ((subjectCode === 'BCS503' || subjectCode === 'BRMK557') && (slotIndex === 6 || slotIndex === 7)) {
    return 'TUTORIAL';
  }

  // Rule 4: MC -> PRACTICAL
  if (subjectCode === 'MC') {
    return 'PRACTICAL';
  }

  // Rule 5: BCS501, BCS508, BCS515B, BIS586 -> THEORY
  if (['BCS501', 'BCS508', 'BCS515B', 'BIS586'].includes(subjectCode)) {
    return 'THEORY';
  }

  // Rule 6: All other entries -> THEORY
  return 'THEORY';
}

// Process the timetable
const timetableWithActivityType = timetable.map(entry => ({
  ...entry,
  activityType: getActivityType(entry)
}));

// Output the result
console.log('const timetable = [');
timetableWithActivityType.forEach((entry, index) => {
  // Format the entry nicely
  let line = `  { day: '${entry.day}', slotIndex: ${entry.slotIndex}, subjectCode: '${entry.subjectCode}', classGroup: '${entry.classGroup}', room: '${entry.room}', teacherId: '${entry.teacherId}'`;

  if (entry.coTeacherId !== undefined && entry.coTeacherId !== null) {
    line += `, coTeacherId: '${entry.coTeacherId}'`;
  }

  line += `, activityType: '${entry.activityType}' }`;

  // Add comma if not the last element
  if (index < timetableWithActivityType.length - 1) {
    line += ',';
  }

  console.log(line);
});
console.log('];');