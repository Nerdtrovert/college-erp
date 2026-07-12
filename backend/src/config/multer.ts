import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Ensure uploads folder exists in root of backend project
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter to accept only safe file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow only specific file extensions
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|ppt|pptx|xls|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Only specific file types are allowed!'));
  }
};

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename: string): string => {
  // Remove path components and keep only the filename
  const name = filename.replace(/^.*[\\/]/, '');
  // Remove dangerous characters
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
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
