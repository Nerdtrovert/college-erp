import { Router } from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller';
import { authenticate } from '../middleware/auth';
import { requireTeacher } from '../middleware/role';
import { validate } from '../middleware/validate';
import { createAnnouncementSchema } from '../validations/announcement.validation';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.post('/', authenticate, requireTeacher, validate(createAnnouncementSchema), createAnnouncement);
router.delete('/:id', authenticate, requireTeacher, deleteAnnouncement);

export default router;