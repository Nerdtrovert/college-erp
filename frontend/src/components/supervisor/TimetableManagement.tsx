import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Save, Clock, CalendarDays, BookOpen, User, MapPin } from 'lucide-react';
import API from '../../services/api';

export const TimetableManagement: React.FC = () => {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error' | null>(null);
  const [slotForm, setSlotForm] = useState({
    day: 'Monday',
    slotIndex: '0',
    classGroup: '',
    subjectCode: '',
    room: '',
    teacherId: ''
  });

  useEffect(() => {
    fetchSemesters();
    API.get('/auth/users?role=teacher')
      .then((response) => setFaculty(response.data || []))
      .catch(() => setFaculty([]));
  }, []);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const response = await API.get('/semesters');
      setSemesters(response.data || []);
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
    setSaveMessageType(null);
    try {
      await API.put('/timetable/slot', {
        ...slotForm,
        semesterId: selectedSemester,
        slotIndex: Number(slotForm.slotIndex)
      });
      setSaveMessage('Timetable slot saved successfully.');
      setSaveMessageType('success');
      fetchTimetable(selectedSemester);
      // Optional form reset/keep classGroup
      setSlotForm(prev => ({
        ...prev,
        subjectCode: '',
        room: '',
        teacherId: ''
      }));
      setTimeout(() => {
        setSaveMessage(null);
        setSaveMessageType(null);
      }, 4000);
    } catch (err: any) {
      setSaveMessage(err.response?.data?.error || 'Unable to save timetable slot.');
      setSaveMessageType('error');
    }
  };

  const getSlotTime = (index: number) => {
    const times = [
      '08:30 - 09:30',
      '09:30 - 10:30',
      '11:00 - 12:00 (Break)',
      '12:00 - 01:00',
      '01:45 - 02:45 (Lunch)',
      '02:45 - 03:45',
      '03:45 - 04:45',
      '04:45 - 05:45'
    ];
    return times[index] || `Period ${index + 1}`;
  };

  if (loading && semesters.length === 0) {
    return <div className="text-center py-12 text-gray-500 font-medium animate-pulse">Loading semesters...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>
        <p className="text-gray-500 text-sm mt-1">Configure class schedules and allocate instructors to periods.</p>
      </div>

      {/* Select Semester Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Academic Semester</label>
          <select
            value={selectedSemester}
            onChange={handleSemesterChange}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
          >
            <option value="">Select a semester to configure timetable...</option>
            {semesters.map((sem: any) => (
              <option key={sem.id} value={sem.id}>
                {sem.name} ({sem.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSemester ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Allocation Form */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              Set Timetable Slot
            </h2>
            <p className="text-xs text-gray-500 mb-6">Assign a subject, room, and faculty to a day and period slot.</p>

            <form onSubmit={saveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Day of Week</label>
                <select
                  value={slotForm.day}
                  onChange={(e) => setSlotForm({ ...slotForm, day: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                    <option key={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Time Period</label>
                <select
                  value={slotForm.slotIndex}
                  onChange={(e) => setSlotForm({ ...slotForm, slotIndex: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((slot) => (
                    <option key={slot} value={slot}>
                      Period {slot + 1} ({getSlotTime(slot)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Class Group</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., CSE-B"
                  value={slotForm.classGroup}
                  onChange={(e) => setSlotForm({ ...slotForm, classGroup: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., CS2301"
                  value={slotForm.subjectCode}
                  onChange={(e) => setSlotForm({ ...slotForm, subjectCode: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Room / Lab (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., LH-3"
                  value={slotForm.room}
                  onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Faculty Member</label>
                <select
                  required
                  value={slotForm.teacherId}
                  onChange={(e) => setSlotForm({ ...slotForm, teacherId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="">Select Faculty...</option>
                  {faculty.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.id})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-colors mt-6"
              >
                <Save size={16} />
                <span>Save Allocation</span>
              </button>

              {saveMessage && (
                <div className={`p-3 text-xs font-semibold rounded-xl text-center mt-3 border ${
                  saveMessageType === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {saveMessage}
                </div>
              )}
            </form>
          </div>

          {/* Schedule Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList size={18} className="text-gray-400" />
                Semester Class Timetable
              </h2>
            </div>

            {timetable.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Day</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period & Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class & Subject</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Room</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {timetable.map((slot: any, index: number) => (
                      <tr key={slot.id || index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <CalendarDays size={14} className="text-gray-400" />
                            {slot.day}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <Clock size={14} className="text-gray-400" />
                            <div>
                              <div className="font-bold text-gray-800">Period {slot.slotIndex + 1}</div>
                              <div className="text-[11px] text-gray-400">{getSlotTime(slot.slotIndex)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen size={14} className="text-blue-500" />
                            <div>
                              <div className="font-bold text-gray-900">{slot.subjectCode || 'N/A'}</div>
                              <div className="text-xs text-gray-500">Group: {slot.classGroup}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm text-gray-600 font-medium">
                            <MapPin size={14} className="text-gray-400" />
                            {slot.room || 'TBD'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-semibold font-mono">
                            <User size={13} className="text-gray-400" />
                            {slot.teacherId || 'TBD'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-900 font-medium">No timetable allocations</p>
                <p className="mt-1 text-sm text-gray-500 max-w-xs mx-auto">
                  Add the first period slot allocation to configure this semester's schedule.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500 font-medium">
          Please select a semester above to manage and view the timetable schedule.
        </div>
      )}
    </div>
  );
};
