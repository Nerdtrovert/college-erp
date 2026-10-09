import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { TeacherTimetable } from '../teacher/TeacherTimetable';
import { UserCircle } from 'lucide-react';
import { DropdownSelect } from '../ui/DropdownSelect';

export const FacultyTimetables: React.FC = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const res = await API.get('/auth/users?role=teacher,dean,principal,hod');
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
          <DropdownSelect
            value={selectedFacultyId}
            onChange={setSelectedFacultyId}
            placeholder="Select a Faculty Member"
            ariaLabel="Select a faculty member"
            leadingIcon={<UserCircle size={20} />}
            options={faculty.map((member) => ({
              value: member.id,
              label: `${member.name} (${member.department})`,
            }))}
          />
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
