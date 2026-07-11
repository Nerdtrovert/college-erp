import React, { useState, useEffect } from 'react';
import type { User } from '../../types';

export const StudentNotes: React.FC<{ user: User }> = ({ user }) => {
  const [notes, setNotes] = useState<Array<any>>([]); // Note shape
  const [loading, setLoading] = useState(true);

  // Load notes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('notes');
    if (stored) {
      try {
        setNotes(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse notes from localStorage', e);
        setNotes([]);
      }
    } else {
      setNotes([]);
    }
    setLoading(false);
  }, []);

  // Helper to download file
  const downloadFile = (base64: string, filename: string) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6 text-center">Loading notes...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Notes & Study Materials</h2>
        {/* Teacher upload button only visible to teachers */}
        {user.role === 'teacher' && (
          <button
            onClick={() => {
              // Navigate to teacher notes upload page via context? For simplicity, we could open a modal.
              // Here we just alert that they need to go to teacher dashboard.
              alert('Please go to Teacher Dashboard to upload notes.');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Upload New Note
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No notes available yet.
        </p>
      ) : (
        <div className="space-y-4">
          {notes.map((note: any) => (
            <div key={note.id} className="border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{note.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Uploaded by <span className="font-medium">{note.uploadedBy}</span>{' '}
                    <span className="text-gray-400">
                      {new Date(note.timestamp).toLocaleString()}
                    </span>
                  </p>
                  {note.description && (
                    <p className="mt-2 text-gray-700">{note.description}</p>
                  )}
                </div>
                <div className="ml-4 flex space-x-2">
                  {note.fileName && (
                    <button
                      onClick={() => downloadFile(note.fileBase64, note.fileName)}
                      className="px-3 py-1 bg-green-600 text-xs text-white rounded hover:bg-green-700 transition"
                    >
                      Download
                    </button>
                  )}
                  {/* Optionally allow teacher to delete their own notes */}
                  {user.role === 'teacher' && note.uploadedBy === user.name && (
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this note?')) {
                          setNotes(prev => prev.filter(n => n.id !== note.id));
                          localStorage.setItem('notes', JSON.stringify([...notes.filter(n => n.id !== note.id)]));
                        }
                      }}
                      className="px-3 py-1 bg-red-600 text-xs text-white rounded hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};