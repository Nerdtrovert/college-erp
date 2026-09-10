import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Ensure uploads folder exists in root of backend project
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const studentFileTypes: Record<string, string[]> = {
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.doc': ['application/msword', 'application/octet-stream'],
  '.pdf': ['application/pdf'],
};

const studentFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = studentFileTypes[ext];

  if (!acceptedMimeTypes || !acceptedMimeTypes.includes(file.mimetype.toLowerCase())) {
    return cb(new Error('Only Excel, Word, and PDF student import files are allowed'));
  }

  cb(null, true);
};

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename: string): string => {
  const name = filename.replace(/^.*[\\/]/, '');
  return name.replace(/[^\w.\-]/g, '_');
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = sanitizeFilename(file.originalname);
    cb(null, uniqueSuffix + '-' + sanitizedName);
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

export const studentUpload = multer({
  storage,
  fileFilter: studentFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const getStudentFileTypes = () => studentFileTypes;
