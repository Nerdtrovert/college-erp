import { Router } from 'express';
import { getNotes, createNote, deleteNote } from '../controllers/note.controller';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../config/multer';
import { validate } from '../middleware/validate';
import { createNoteSchema } from '../validations/note.validation';

const router = Router();

router.get('/', authenticate, getNotes);
router.post('/', authenticate, authorize(['teacher']), upload.single('file'), validate(createNoteSchema), createNote);
router.delete('/:id', authenticate, authorize(['teacher']), deleteNote);

export default router;
