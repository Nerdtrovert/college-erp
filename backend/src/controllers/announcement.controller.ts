import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  const role = req.user?.role;
  const classGroup = req.user?.classGroup;

  try {
    let whereClause = {};

    // For students, filter announcements targeted to "all" or their specific section/class ID
    if (role === 'student' && classGroup) {
      whereClause = {
        OR: [
          { target: 'all' },
          { target: classGroup },
          { target: classGroup.toLowerCase() },
        ],
      };
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      include: {
        author: {
          select: { name: true },
        },
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const mapped = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      category: a.category,
      date: a.date,
      author: a.author.name,
      pinned: a.pinned,
      target: a.target,
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({ error: 'Internal server error while fetching announcements' });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  const { title, body, category, target, pinned } = req.body;
  const authorId = req.user?.id;

  if (!authorId) {
    return res.status(401).json({ error: 'Unauthorized: Missing author context' });
  }

  try {
    // Generate date string like "Nov 10, 2024" to match UI mock data format
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body,
        category,
        date: formattedDate,
        authorId,
        target,
        pinned: pinned || false,
      },
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    return res.status(201).json({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      date: announcement.date,
      author: announcement.author.name,
      pinned: announcement.pinned,
      target: announcement.target,
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return res.status(500).json({ error: 'Internal server error while creating announcement' });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid announcement ID parameter' });
  }

  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Double check authorization: only original publisher (or any teacher) can delete
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Forbidden: Only teachers can delete announcements' });
    }

    await prisma.announcement.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return res.status(500).json({ error: 'Internal server error while deleting announcement' });
  }
};
