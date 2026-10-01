import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';
import { readRecentLogs, writeLog } from '../utils/appLogger';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import { upload } from '../config/multer';
import { createAdminUploadSchema } from '../validations/admin.upload.validation';
import { validate } from '../middleware/validate';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || (config.nodeEnv === 'development' ? 'adminHNNCE' : '');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (config.nodeEnv === 'development' ? 'admin123' : '');

if (config.nodeEnv === 'production' && (!ADMIN_USERNAME || !ADMIN_PASSWORD)) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be configured in production');
}

export const adminLogin = (req: Request, res: Response) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    writeLog('WARN', 'Failed admin login attempt', { username });
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = jwt.sign(
    { id: ADMIN_USERNAME, role: 'admin', name: 'System Administrator', admin: true },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  writeLog('INFO', 'Admin portal login successful', { username });
  return res.status(200).json({
    token,
    user: { id: ADMIN_USERNAME, role: 'admin', name: 'System Administrator' }
  });
};

export const getAdminLogs = (_req: Request, res: Response) => {
  return res.status(200).json({
    lines: readRecentLogs(100),
    lineCount: 100,
    fileName: 'application.log'
  });
};

export const downloadAdminLogs = (_req: Request, res: Response) => {
  res.attachment('application.log');
  return res.type('text/plain').send(`${readRecentLogs(100).join('\n')}\n`);
};

// Ensure uploads directory exists and get its absolute path
const uploadDir = path.join(__dirname, '../../uploads');

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename: string): string => {
  const name = filename.replace(/^.*[\\/]/, '');
  return name.replace(/[^\w.\-]/g, '_');
};

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

export const createAdminUpload = async (req: AuthRequest, res: Response) => {
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
    // 2. We only perform a single database operation (create one admin upload record)
    // 3. We maintain consistency between file and DB via manual cleanup:
    //    - If DB write fails, we delete the uploaded file
    //    - File read failures for response don't affect storage success
    const adminUpload = await prisma.adminUpload.create({
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
      const buffer = fs.readFileSync(adminUpload.filePath);
      // Ensure the file path is safe before reading
      if (isSafePath(adminUpload.filePath)) {
        fileBase64 = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
      } else {
        console.error(`Unsafe file path detected: ${adminUpload.filePath}`);
      }
    } catch (err) {
      console.error('Error converting uploaded file to Base64:', err);
    }

    return res.status(201).json({
      id: adminUpload.id,
      title: adminUpload.title,
      description: adminUpload.description,
      fileName: adminUpload.fileName,
      fileBase64,
      uploadedBy: adminUpload.uploadedBy.name,
      timestamp: adminUpload.createdAt.getTime(), // Milliseconds since epoch for precision
      date: adminUpload.createdAt.toISOString(), // ISO string for consistency with API standards
      formattedDate: adminUpload.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }), // Formatted string for display
    });
  } catch (error) {
    console.error('Error creating admin upload record:', error);
    // Cleanup physical file on DB failure
    if (file && fs.existsSync(file.path) && isSafePath(file.path)) {
      fs.unlinkSync(file.path);
    }
    return res.status(500).json({ error: 'Internal server error while uploading file' });
  }
};
