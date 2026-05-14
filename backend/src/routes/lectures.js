const express = require('express');
const { body, param, validationResult } = require('express-validator');
const lecturesRepo = require('../repos/lectures');
const subjects = require('../repos/subjects');
const { attachUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

function mapLecture(l) {
  if (!l) return null;
  const subjectName = l.subjectName ?? l.subject?.name;
  const subjectCode = l.subjectCode ?? l.subject?.code;
  return {
    id: l.id,
    subjectId: l.subjectId,
    subjectName,
    subjectCode,
    title: l.title,
    scheduledAt: l.scheduledAt,
    endsAt: l.endsAt,
    room: l.room,
    isActive: l.isActive,
  };
}

router.get('/', attachUser(), requireAuth(['admin', 'student']), async (req, res) => {
  const { subjectId, from, to, activeOnly } = req.query;
  const rows = await lecturesRepo.listLectures({
    subjectId: subjectId || null,
    from: from || null,
    to: to || null,
    activeOnly,
    studentOnlyActive: req.user.role === 'student',
  });
  res.json(rows.map(mapLecture));
});

router.use(attachUser(), requireAuth('admin'));

router.post(
  '/',
  body('subjectId').isUUID(),
  body('title').optional().isString().trim(),
  body('scheduledAt').isISO8601(),
  body('endsAt').optional({ nullable: true }).isISO8601(),
  body('room').optional().isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const sub = await subjects.findById(req.body.subjectId);
    if (!sub) return res.status(400).json({ message: 'Subject not found' });

    const lecture = await lecturesRepo.createLecture({
      subjectId: req.body.subjectId,
      title: req.body.title || 'Lecture',
      scheduledAt: new Date(req.body.scheduledAt),
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
      room: req.body.room || '',
    });
    res.status(201).json(mapLecture(lecture));
  }
);

router.patch(
  '/:id',
  param('id').isUUID(),
  body('isActive').optional().isBoolean(),
  body('title').optional().isString().trim(),
  body('scheduledAt').optional().isISO8601(),
  body('endsAt').optional({ nullable: true }).isISO8601(),
  body('room').optional().isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await lecturesRepo.findByIdWithSubject(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Lecture not found' });

    const patch = {};
    if (typeof req.body.isActive === 'boolean') patch.isActive = req.body.isActive;
    if (req.body.title) patch.title = req.body.title;
    if (req.body.scheduledAt) patch.scheduledAt = new Date(req.body.scheduledAt);
    if (req.body.endsAt !== undefined) {
      patch.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;
    }
    if (req.body.room !== undefined) patch.room = req.body.room;

    const lecture = await lecturesRepo.updateLecture(req.params.id, patch);
    res.json(mapLecture(lecture));
  }
);

router.delete('/:id', param('id').isUUID(), async (req, res) => {
  const lecture = await lecturesRepo.findByIdWithSubject(req.params.id);
  if (!lecture) return res.status(404).json({ message: 'Not found' });
  await lecturesRepo.deleteById(req.params.id);
  res.status(204).send();
});

module.exports = router;
