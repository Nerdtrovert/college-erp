import React, { useState, useEffect } from 'react';
import {
  
  MapPin,
  Square,
  Users,
  Loader2,
  AlertTriangle,
  
  
} from 'lucide-react';
import API from '../../services/api';

interface StudentScore {
  id: string;
  name: string;
  department: string;
  classGroup: string;
  totalScore: number;
}

interface LeaderboardData {
  [key: string]: StudentScore[];
}

export const Leaderboard: React.FC = () => {
  const [deptLeaderboard, setDeptLeaderboard] = useState<LeaderboardData>({});
  const [classLeaderboard, setClassLeaderboard] = useState<LeaderboardData>({});
  const [batchLeaderboard, setBatchLeaderboard] = useState<LeaderboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markType, setMarkType] = useState<'cie1' | 'cie2' | 'cie3' | 'total'>('cie1');

  const fetchLeaderboards = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, classRes, batchRes] = await Promise.all([
        API.get(`/vip/leaderboard/dept?type=${markType}`),
        API.get(`/vip/leaderboard/class?type=${markType}`),
        API.get(`/vip/leaderboard/batch?type=${markType}`)
      ]);
      setDeptLeaderboard(deptRes.data);
      setClassLeaderboard(classRes.data);
      setBatchLeaderboard(batchRes.data);
    } catch (err: any) {
      console.error('Error fetching leaderboards:', err);
      setError(err.response?.data?.error || 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, [markType]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 font-medium">
        <Loader2 className="animate-spin text-blue-700 mb-3" size={32} />
        Loading leaderboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <AlertTriangle className="mr-2 h-5 w-5" /> <span>{error}</span>
      </div>
    );
  }

  const markTypeLabels: Record<'cie1' | 'cie2' | 'cie3' | 'total', string> = {
    cie1: 'CIE-1',
    cie2: 'CIE-2',
    cie3: 'CIE-3',
    total: 'Total Internal Marks'
  };

  const renderLeaderboard = (title: string, Icon: React.ComponentType<any>, data: LeaderboardData) => {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <Icon size={18} />
            </div>
            <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {Object.entries(data).map(([group, students]) => (
            <div key={group} className="px-6 py-4">
              <h3 className="font-semibold text-gray-800 mb-3">{group}</h3>
              <div className="space-y-2">
                {students.length > 0 ? (
                  students.map((student, index) => (
                    <div key={student.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0 bg-blue-50 text-blue-700 rounded-xl px-2 py-1 text-xs font-medium">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {student.department} • {student.classGroup || 'N/A'}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right text-blue-600 font-semibold">
                          {student.totalScore} pts
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">No data available for this group.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboards</h1>
        <p className="text-gray-500 text-sm">
          Top 5 students based on {markTypeLabels[markType]} scores in the active semester.
        </p>

        {/* Mark Type Selector */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-gray-600 font-medium">Mark Type:</span>
          <div className="flex flex-wrap gap-2">
            {([ 'cie1', 'cie2', 'cie3', 'total' ] as const).map(type => (
              <button
                key={type}
                onClick={() => setMarkType(type)}
                className={`px-3 py-1.5 text-sm font-medium rounded-border transition-colors duration-200 ${
                  markType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {markTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Department Leaderboard */}
      {renderLeaderboard(
        'Top 5 by Department',
        MapPin,
        deptLeaderboard
      )}

      {/* Class Leaderboard */}
      {renderLeaderboard(
        'Top 5 by Class/Section',
        Square,
        classLeaderboard
      )}

      {/* Batch Leaderboard */}
      {renderLeaderboard(
        'Top 5 Overall Batch',
        Users,
        batchLeaderboard
      )}
    </div>
  );
};

export default Leaderboard;