import { Router } from 'express';
import { getNotes, createNote, deleteNote } from '../controllers/note.controller';
import { authenticate } from '../middleware/auth';
import { requireTeacher } from '../middleware/role';
import { upload } from '../config/multer';
import { validate } from '../middleware/validate';
import { createNoteSchema } from '../validations/note.validation';

const router = Router();

router.get('/', authenticate, getNotes);
router.post('/', authenticate, requireTeacher, upload.single('file'), validate(createNoteSchema), createNote);
router.delete('/:id', authenticate, requireTeacher, deleteNote);

export default router;