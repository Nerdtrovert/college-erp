import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

// Ensure uploads directory exists and get its absolute path
const uploadDir = path.join(__dirname, '../../uploads');

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename: string): string => {
  const name = filename.replace(/^.*[\\/]/, '');
  return name.replace(/[^\w.\-]/g, '_');
};

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Security helper to verify a file path is within the upload directory
const isSafePath = (filePath: string): boolean => {
  try {
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    return resolvedPath.startsWith(resolvedUploadDir);
  } catch (err) {
    return false;
  }
};

export const getNotes = async (req: AuthRequest, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      include: {
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const notesWithBase64 = notes.map((note) => {
      let fileBase64 = '';
      try {
        if (fs.existsSync(note.filePath) && isSafePath(note.filePath)) {
          const buffer = fs.readFileSync(note.filePath);
          // Convert binary buffer to Base64 so the frontend download action runs unchanged
          fileBase64 = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
        }
      } catch (err) {
        console.error(`Error converting note file ${note.id} to Base64:`, err);
      }

      return {
        id: note.id,
        title: note.title,
        description: note.description,
        fileName: note.fileName,
        fileBase64,
        uploadedBy: note.uploadedBy.name,
        timestamp: note.createdAt.getTime(), // Milliseconds since epoch for precision
        date: note.createdAt.toISOString(), // ISO string for consistency with API standards
        formattedDate: note.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }), // Formatted string for display (matches announcement format)
      };
    });

    return res.status(200).json(notesWithBase64);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return res.status(500).json({ error: 'Internal server error while fetching notes list' });
  }
};

export const createNote = async (req: AuthRequest, res: Response) => {
  const { title, description } = req.body;
  const file = req.file;
  const uploadedById = req.user?.id;

  if (!uploadedById) {
    return res.status(401).json({ error: 'Unauthorized: User context missing' });
  }

  if (!file) {
    return res.status(400).json({ error: 'Validation failed: File is required' });
  }

  try {
    // Note: We don't use a database transaction here because:
    // 1. The file is already saved to disk by multer middleware before this function runs
    // 2. We only perform a single database operation (create one note record)
    // 3. We maintain consistency between file and DB via manual cleanup:
    //    - If DB write fails, we delete the uploaded file
    //    - File read failures for response don't affect storage success
    const note = await prisma.note.create({
      data: {
        title,
        description: description || '',
        fileName: sanitizeFilename(file.originalname), // Store sanitized filename
        filePath: file.path,
        uploadedById,
      },
      include: {
        uploadedBy: { select: { name: true } },
      },
    });

    // Provide the Base64 of the uploaded file for immediate availability
    let fileBase64 = '';
    try {
      const buffer = fs.readFileSync(note.filePath);
      // Ensure the file path is safe before reading
      if (isSafePath(note.filePath)) {
        fileBase64 = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
      } else {
        console.error(`Unsafe file path detected: ${note.filePath}`);
      }
    } catch (err) {
      console.error('Error converting uploaded file to Base64:', err);
    }

    return res.status(201).json({
      id: note.id,
      title: note.title,
      description: note.description,
      fileName: note.fileName,
      fileBase64,
      uploadedBy: note.uploadedBy.name,
      timestamp: note.createdAt.getTime(), // Milliseconds since epoch for precision
      date: note.createdAt.toISOString(), // ISO string for consistency with API standards
      formattedDate: note.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }), // Formatted string for display (matches announcement format)
    });
  } catch (error) {
    console.error('Error creating note record:', error);
    // Cleanup physical file on DB failure
    if (file && fs.existsSync(file.path) && isSafePath(file.path)) {
      fs.unlinkSync(file.path);
    }
    return res.status(500).json({ error: 'Internal server error while uploading note' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };

  try {
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Authorization: Only teachers can delete notes
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Forbidden: Only faculty can delete notes' });
    }

    // Delete the file from filesystem
    if (fs.existsSync(note.filePath) && isSafePath(note.filePath)) {
      fs.unlinkSync(note.filePath);
    }

    await prisma.note.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return res.status(500).json({ error: 'Internal server error while deleting note' });
  }
};
