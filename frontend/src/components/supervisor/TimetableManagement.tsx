import React, { useState, useEffect } from 'react';
import API from '../../services/api';

export const TimetableManagement: React.FC = () => {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState({ day: 'Monday', slotIndex: '0', classGroup: '', subjectCode: '', room: '', teacherId: '' });

  useEffect(() => {
    fetchSemesters();
    API.get('/auth/users?role=teacher').then((response) => setFaculty(response.data || [])).catch(() => setFaculty([]));
  }, []);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const response = await API.get('/semesters');
      setSemesters(response.data);
    } catch (err: any) {
      console.error('Failed to fetch semesters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (semesterId: string) => {
    try {
      setLoading(true);
      const response = await API.get(`/timetable/semester/${semesterId}`);
      setTimetable(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch timetable:', err);
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const semesterId = e.target.value;
    setSelectedSemester(semesterId);
    if (semesterId) {
      fetchTimetable(semesterId);
    } else {
      setTimetable([]);
    }
  };

  const saveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSemester) return;
    setSaveMessage(null);
    try {
      await API.put('/timetable/slot', { ...slotForm, semesterId: selectedSemester, slotIndex: Number(slotForm.slotIndex) });
      setSaveMessage('Timetable slot saved.');
      fetchTimetable(selectedSemester);
    } catch (err: any) {
      setSaveMessage(err.response?.data?.error || 'Unable to save timetable slot.');
    }
  };

  if (loading && semesters.length === 0) {
    return <div className="text-center py-12">Loading semesters...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Semester</label>
          <select
            value={selectedSemester}
            onChange={handleSemesterChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a semester to view timetable</option>
            {semesters.map((sem: any) => (
              <option key={sem.id} value={sem.id}>
                {sem.name} ({sem.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSemester ? (
        <div>
          <form onSubmit={saveSlot} className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Set timetable slot</h2>
            <p className="mb-4 text-sm text-gray-500">Assign a subject and faculty member to a class slot. Saving the same class, day, and slot updates it.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <select value={slotForm.day} onChange={(e) => setSlotForm({ ...slotForm, day: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => <option key={day}>{day}</option>)}
              </select>
              <select value={slotForm.slotIndex} onChange={(e) => setSlotForm({ ...slotForm, slotIndex: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((slot) => <option key={slot} value={slot}>Period {slot + 1}</option>)}
              </select>
              <input required placeholder="Class group (e.g. CSE-B)" value={slotForm.classGroup} onChange={(e) => setSlotForm({ ...slotForm, classGroup: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2" />
              <input required placeholder="Subject code (e.g. CS2301)" value={slotForm.subjectCode} onChange={(e) => setSlotForm({ ...slotForm, subjectCode: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2" />
              <input placeholder="Room (optional)" value={slotForm.room} onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2" />
              <select required value={slotForm.teacherId} onChange={(e) => setSlotForm({ ...slotForm, teacherId: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2">
                <option value="">Select faculty</option>
                {faculty.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.id})</option>)}
              </select>
            </div>
            <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700">Save slot</button>
            {saveMessage && <p className="mt-3 text-sm text-gray-700">{saveMessage}</p>}
          </form>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Timetable for {semesters.find((s: any) => s.id === selectedSemester)?.name || 'Selected Semester'}
          </h2>

          {timetable.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Slot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                    <th className="px-6 px-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timetable.map((slot: any, index: number) => (
                    <tr key={slot.id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{slot.day}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{slot.slotIndex}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{slot.subjectCode || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{slot.room || 'TBD'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{slot.teacherId || 'TBD'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No timetable data available for this semester.</p>
              {selectedSemester && (
                <p className="mt-2 text-sm text-gray-400">
                  Timetable management functionality allows viewing timetables for any semester.
                  In a production system, this would also include capabilities to create, edit, and manage class schedules.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Please select a semester to view its timetable.</p>
        </div>
      )}
    </div>
  );
};
