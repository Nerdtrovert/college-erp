import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { TeacherTimetable } from '../teacher/TeacherTimetable';
import { UserCircle } from 'lucide-react';

export const FacultyTimetables: React.FC = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const res = await API.get('/auth/users?role=teacher');
        setFaculty(res.data);
      } catch (err) {
        console.error('Failed to load faculty:', err);
      }
    };
    fetchFaculty();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Timetables</h1>
          <p className="mt-1 text-sm text-gray-500">View weekly schedule grids for any faculty member.</p>
        </div>
        <div className="w-full max-w-xl">
          <div className="relative">
            <select
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
              className="w-full appearance-none pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 text-base font-semibold text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="" disabled>Select a Faculty Member</option>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.department})</option>
              ))}
            </select>
            <UserCircle size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {selectedFacultyId ? (
        <TeacherTimetable teacherId={selectedFacultyId} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <UserCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No Faculty Selected</h3>
          <p className="text-gray-500 mt-2">Select a faculty member from the dropdown above to view their schedule.</p>
        </div>
      )}
    </div>
  );
};
