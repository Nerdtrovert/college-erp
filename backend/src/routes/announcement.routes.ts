import { Router } from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAnnouncementSchema } from '../validations/announcement.validation';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.post('/', authenticate, authorize(['teacher']), validate(createAnnouncementSchema), createAnnouncement);
router.delete('/:id', authenticate, authorize(['teacher']), deleteAnnouncement);

export default router;
