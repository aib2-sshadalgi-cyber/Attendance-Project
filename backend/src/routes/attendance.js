const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Lecture = require('../models/Lecture');
const Student = require('../models/Student');
const { attachUser, requireAuth } = require('../middleware/auth');
const { faceMatch, isValidDescriptor } = require('../utils/faceMatch');

const router = express.Router();

router.use(attachUser(), requireAuth(['admin', 'student']));

router.get('/monitor/:lectureId', requireAuth('admin'), async (req, res) => {
  const { lectureId } = req.params;
  const lecture = await Lecture.findById(lectureId).populate('subject', 'name code').lean();
  if (!lecture) return res.status(404).json({ message: 'Lecture not found' });

  const rows = await Attendance.find({ lecture: lectureId })
    .populate('student', 'name rollNumber department')
    .sort({ scannedAt: -1 })
    .lean();

  res.json({
    lecture: {
      id: lecture._id,
      title: lecture.title,
      subjectName: lecture.subject?.name,
      subjectCode: lecture.subject?.code,
      scheduledAt: lecture.scheduledAt,
    },
    records: rows.map((r) => ({
      studentName: r.student?.name,
      rollNumber: r.student?.rollNumber,
      department: r.student?.department,
      scannedAt: r.scannedAt,
      status: r.status,
    })),
    countPresent: rows.length,
  });
});

router.get('/export', requireAuth('admin'), async (req, res) => {
  const { lectureId } = req.query;
  const filter = {};
  if (lectureId) filter.lecture = lectureId;

  const rows = await Attendance.find(filter)
    .populate('student', 'name rollNumber department')
    .populate({ path: 'lecture', select: 'title scheduledAt subject', populate: { path: 'subject', select: 'name code' } })
    .sort({ scannedAt: -1 })
    .lean();

  const header = ['Subject', 'SubjectCode', 'LectureTitle', 'LectureAt', 'StudentName', 'RollNumber', 'Department', 'Status', 'ScannedAt'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const escaped = [
      r.lecture?.subject?.name || '',
      r.lecture?.subject?.code || '',
      r.lecture?.title || '',
      r.lecture?.scheduledAt ? new Date(r.lecture.scheduledAt).toISOString() : '',
      r.student?.name || '',
      r.student?.rollNumber || '',
      r.student?.department || '',
      r.status || '',
      r.scannedAt ? new Date(r.scannedAt).toISOString() : '',
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
    lines.push(escaped.join(','));
  }

  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
  res.send(csv);
});

router.get('/my', async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only' });
  const student = await Student.findOne({ user: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student profile missing' });

  const { from, to } = req.query;
  const filter = { student: student._id };
  let list = await Attendance.find(filter)
    .populate({
      path: 'lecture',
      select: 'title scheduledAt subject',
      populate: { path: 'subject', select: 'name code' },
    })
    .sort({ scannedAt: -1 })
    .lean();

  if (from || to) {
    list = list.filter((item) => {
      const at = item.lecture?.scheduledAt ? new Date(item.lecture.scheduledAt) : null;
      if (!at) return false;
      if (from && at < new Date(from)) return false;
      if (to && at > new Date(to)) return false;
      return true;
    });
  }

  const summary = {
    total: list.length,
    present: list.filter((x) => x.status === 'present').length,
  };

  res.json({
    summary,
    attendance: list.map((a) => ({
      subjectName: a.lecture?.subject?.name,
      subjectCode: a.lecture?.subject?.code,
      lectureTitle: a.lecture?.title,
      lectureAt: a.lecture?.scheduledAt,
      status: a.status,
      scannedAt: a.scannedAt,
    })),
  });
});

router.post(
  '/scan',
  body('lectureId').isMongoId(),
  body('faceDescriptor').isArray({ min: 128, max: 128 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Students only' });
    }

    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student profile missing' });
    if (!student.faceDescriptor || !student.faceDescriptor.length) {
      return res.status(400).json({ message: 'Face not registered. Contact admin.' });
    }

    const { lectureId, faceDescriptor } = req.body;
    const lecture = await Lecture.findById(lectureId).populate('subject', 'name code');
    if (!lecture || !lecture.isActive) {
      return res.status(404).json({ message: 'Lecture not found or closed' });
    }

    const existing = await Attendance.findOne({ student: student._id, lecture: lectureId });
    if (existing) {
      const subjectName = lecture.subject?.name || 'this subject';
      return res.status(409).json({
        code: 'ALREADY_MARKED',
        message: `Scanned for (${subjectName}) Lecture`,
      });
    }

    const bypass = process.env.DISABLE_FACE_VERIFY === 'true';

    if (!bypass) {
      if (!isValidDescriptor(faceDescriptor)) {
        return res.status(400).json({ message: 'Invalid face descriptor' });
      }
      const matched = faceMatch(faceDescriptor, student.faceDescriptor);
      if (!matched) {
        return res.status(403).json({ message: 'Face does not match registered profile' });
      }
    }

    try {
      const record = await Attendance.create({
        student: student._id,
        lecture: lectureId,
        status: 'present',
      });
      await record.populate({
        path: 'lecture',
        select: 'title scheduledAt subject',
        populate: { path: 'subject', select: 'name code' },
      });

      const r = record.toObject();
      return res.status(201).json({
        success: true,
        message: `Marked present for ${lecture.subject?.name || lecture.title}`,
        subjectName: lecture.subject?.name,
        scannedAt: r.scannedAt,
      });
    } catch (e) {
      if (e.code === 11000) {
        await lecture.populate('subject');
        const subjectName = lecture.subject?.name || 'this subject';
        return res.status(409).json({
          code: 'ALREADY_MARKED',
          message: `Scanned for (${subjectName}) Lecture`,
        });
      }
      throw e;
    }
  }
);

router.get('/', requireAuth('admin'), async (req, res) => {
  const { lectureId, rollNumber } = req.query;
  const filter = {};
  if (lectureId) filter.lecture = lectureId;

  let records = Attendance.find(filter)
    .populate('student', 'name rollNumber department')
    .populate({
      path: 'lecture',
      select: 'title scheduledAt subject',
      populate: { path: 'subject', select: 'name code' },
    })
    .sort({ scannedAt: -1 });

  records = await records.lean();

  if (rollNumber) {
    records = records.filter((r) => r.student?.rollNumber === rollNumber);
  }

  res.json(
    records.map((r) => ({
      id: r._id,
      studentName: r.student?.name,
      rollNumber: r.student?.rollNumber,
      department: r.student?.department,
      lectureTitle: r.lecture?.title,
      subjectName: r.lecture?.subject?.name,
      lectureAt: r.lecture?.scheduledAt,
      status: r.status,
      scannedAt: r.scannedAt,
    }))
  );
});

module.exports = router;
