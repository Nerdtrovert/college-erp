import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Loader2
} from 'lucide-react';
import type { User } from '../../types';
import API from '../../services/api';

export const TeacherNotes: React.FC<{ user: User }> = ({ user }) => {
  const [notes, setNotes] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    file: null as File | null,
    filePreview: '' as string, // base64 preview
  });

  // Load notes from backend
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await API.get('/notes');
        setNotes(res.data);
      } catch (e) {
        console.error('Failed to parse notes:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm(prev => ({ ...prev, file: null, filePreview: '' }));
      return;
    }
    setForm(prev => ({ ...prev, file }));
    // Preview for images or just store as base64 for later upload
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, filePreview: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!form.file) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      // Build multipart Form Data for Multer
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('description', form.description.trim());
      formData.append('file', form.file);

      const res = await API.post('/notes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update state
      setNotes(prev => [res.data, ...prev]); // prepend newest

      // Reset form
      setForm({ title: '', description: '', file: null, filePreview: '' });
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Error uploading note:', err);
      alert('Failed to upload note. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete note (teacher only)
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await API.delete(`/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-medium">Loading study notes...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Upload size={20} className="text-blue-600" />
          Upload & Manage Notes
        </h1>
        <p className="mt-2 text-gray-600">
          Upload study materials, lecture notes, or any files for students to access.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="Enter note title"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Add a brief description..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
            <div className="flex flex-col space-y-2">
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500"
              />
              {form.filePreview && (
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="text-blue-500" />
                  <span className="break-all max-w-xs">{form.file?.name || 'File selected'}</span>
                  {!form.file?.type.startsWith('image/') && (
                    <span className="text-gray-500">(ready to upload)</span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PDF, DOC, DOCX, TXT, PPT, PPTX, JPG, PNG
            </p>
          </div>

          <button
            type="submit"
            disabled={uploading || !form.file}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Upload Note</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Uploaded Notes List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="text-blue-600" />
          My Uploaded Notes
        </h2>

        {notes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            You haven't uploaded any notes yet.
          </p>
        ) : (
          <div className="space-y-4">
            {notes
              .filter(note => note.uploadedBy === user.name) // only show teacher's own notes
              .map(note => (
                <div key={note.id} className="border rounded-xl p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{note.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded <span className="font-medium">{new Date(note.timestamp).toLocaleString()}</span>
                      </p>
                      {note.description && (
                        <p className="mt-2 text-gray-700">{note.description}</p>
                      )}
                    </div>
                    <div className="ml-4 flex space-x-2">
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = note.fileBase64;
                          a.download = note.fileName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-3 py-1 bg-green-600 text-xs text-white rounded hover:bg-green-700 transition"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="px-3 py-1 bg-red-600 text-xs text-white rounded hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};