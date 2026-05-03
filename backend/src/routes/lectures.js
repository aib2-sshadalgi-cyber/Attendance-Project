const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Lecture = require('../models/Lecture');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const { attachUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

/** List lectures (students: optional filter active; admins: all) */
router.get('/', attachUser(), requireAuth(['admin', 'student']), async (req, res) => {
  const { subjectId, from, to, activeOnly } = req.query;
  const filter = {};
  if (subjectId) filter.subject = subjectId;
  if (from || to) {
    filter.scheduledAt = {};
    if (from) filter.scheduledAt.$gte = new Date(from);
    if (to) filter.scheduledAt.$lte = new Date(to);
  }
  if (activeOnly === 'true') filter.isActive = true;

  let query = Lecture.find(filter).populate('subject', 'name code').sort({ scheduledAt: -1 });

  if (req.user.role === 'student') {
    query = query.where({ isActive: true });
  }

  const lectures = await query.lean().exec();

  const list = lectures.map((l) => ({
    id: l._id,
    subjectId: l.subject?._id,
    subjectName: l.subject?.name,
    subjectCode: l.subject?.code,
    title: l.title,
    scheduledAt: l.scheduledAt,
    endsAt: l.endsAt,
    room: l.room,
    isActive: l.isActive,
  }));
  res.json(list);
});

router.use(attachUser(), requireAuth('admin'));

router.post(
  '/',
  body('subjectId').isMongoId(),
  body('title').optional().isString().trim(),
  body('scheduledAt').isISO8601(),
  body('endsAt').optional({ nullable: true }).isISO8601(),
  body('room').optional().isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const sub = await Subject.findById(req.body.subjectId);
    if (!sub) return res.status(400).json({ message: 'Subject not found' });

    const lecture = await Lecture.create({
      subject: req.body.subjectId,
      title: req.body.title || 'Lecture',
      scheduledAt: new Date(req.body.scheduledAt),
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
      room: req.body.room || '',
    });
    await lecture.populate('subject', 'name code');

    const l = lecture.toObject();
    res.status(201).json({
      id: l._id,
      subjectId: l.subject?._id,
      subjectName: l.subject?.name,
      subjectCode: l.subject?.code,
      title: l.title,
      scheduledAt: l.scheduledAt,
      endsAt: l.endsAt,
      room: l.room,
      isActive: l.isActive,
    });
  }
);

router.patch(
  '/:id',
  param('id').isMongoId(),
  body('isActive').optional().isBoolean(),
  body('title').optional().isString().trim(),
  body('scheduledAt').optional().isISO8601(),
  body('endsAt').optional({ nullable: true }).isISO8601(),
  body('room').optional().isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ message: 'Lecture not found' });

    if (typeof req.body.isActive === 'boolean') lecture.isActive = req.body.isActive;
    if (req.body.title) lecture.title = req.body.title;
    if (req.body.scheduledAt) lecture.scheduledAt = new Date(req.body.scheduledAt);
    if (req.body.endsAt !== undefined) lecture.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;
    if (req.body.room !== undefined) lecture.room = req.body.room;
    await lecture.save();
    await lecture.populate('subject', 'name code');
    const l = lecture.toObject();
    res.json({
      id: l._id,
      subjectId: l.subject?._id,
      subjectName: l.subject?.name,
      subjectCode: l.subject?.code,
      title: l.title,
      scheduledAt: l.scheduledAt,
      endsAt: l.endsAt,
      room: l.room,
      isActive: l.isActive,
    });
  }
);

router.delete('/:id', param('id').isMongoId(), async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) return res.status(404).json({ message: 'Not found' });
  await Attendance.deleteMany({ lecture: req.params.id });
  await Lecture.deleteOne({ _id: req.params.id });
  res.status(204).send();
});

module.exports = router;
