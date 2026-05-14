const express = require('express');
const { body, validationResult } = require('express-validator');
const attendanceRepo = require('../repos/attendance');
const lecturesRepo = require('../repos/lectures');
const students = require('../repos/students');
const { attachUser, requireAuth } = require('../middleware/auth');
const { faceMatch, isValidDescriptor, euclideanDistance } = require('../utils/faceMatch');

const router = express.Router();

router.use(attachUser(), requireAuth(['admin', 'student', 'scanner']));

function getFaceThreshold() {
  return Number(process.env.FACE_MATCH_THRESHOLD || 0.55);
}

async function findBestStudentMatch(faceDescriptor) {
  const candidates = await students.listRegisteredWithFaces();
  let best = null;
  const threshold = getFaceThreshold();

  for (const student of candidates) {
    if (!isValidDescriptor(student.faceDescriptor)) continue;
    const distance = euclideanDistance(faceDescriptor, student.faceDescriptor);
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { ...student, distance };
    }
  }

  return best;
}

router.get('/monitor/:lectureId', requireAuth('admin'), async (req, res) => {
  const { lectureId } = req.params;
  const data = await attendanceRepo.findMonitorByLectureId(lectureId);
  if (!data) return res.status(404).json({ message: 'Lecture not found' });

  const { lecture, records } = data;
  res.json({
    lecture: {
      id: lecture.id,
      title: lecture.title,
      subjectName: lecture.subject?.name,
      subjectCode: lecture.subject?.code,
      scheduledAt: lecture.scheduledAt,
    },
    records: records.map((r) => ({
      studentName: r.studentName,
      rollNumber: r.rollNumber,
      department: r.department,
      scannedAt: r.scannedAt,
      status: r.status,
    })),
    countPresent: records.length,
  });
});

router.get('/export', requireAuth('admin'), async (req, res) => {
  const { lectureId } = req.query;
  const rows = await attendanceRepo.findForExport(lectureId || null);

  const header = ['Subject', 'SubjectCode', 'LectureTitle', 'LectureAt', 'StudentName', 'RollNumber', 'Department', 'Status', 'ScannedAt'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const escaped = [
      r.subjectName || '',
      r.subjectCode || '',
      r.lectureTitle || '',
      r.lectureAt ? new Date(r.lectureAt).toISOString() : '',
      r.studentName || '',
      r.rollNumber || '',
      r.department || '',
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
  const student = await students.findByUserId(req.user.id);
  if (!student) return res.status(404).json({ message: 'Student profile missing' });

  const { from, to } = req.query;
  const list = await attendanceRepo.findMyAttendance(
    student.id,
    from ? new Date(from) : null,
    to ? new Date(to) : null
  );

  const summary = {
    total: list.length,
    present: list.filter((x) => x.status === 'present').length,
  };

  res.json({
    summary,
    attendance: list.map((a) => ({
      subjectName: a.subjectName,
      subjectCode: a.subjectCode,
      lectureTitle: a.lectureTitle,
      lectureAt: a.lectureAt,
      status: a.status,
      scannedAt: a.scannedAt,
    })),
  });
});

router.post(
  '/staff-scan',
  body('lectureId').isUUID(),
  body('faceDescriptor').isArray({ min: 128, max: 128 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (!['scanner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Scanner access required' });
    }

    const { lectureId, faceDescriptor } = req.body;
    const lecture = await lecturesRepo.findByIdWithSubject(lectureId);
    if (!lecture || !lecture.isActive) {
      return res.status(404).json({ message: 'Lecture not found or closed' });
    }

    if (!isValidDescriptor(faceDescriptor)) {
      return res.status(400).json({ message: 'Invalid face descriptor' });
    }

    const matched = await findBestStudentMatch(faceDescriptor);
    if (!matched) {
      return res.status(403).json({ message: 'No registered student matched this face' });
    }

    const existing = await attendanceRepo.findByStudentAndLecture(matched.id, lectureId);
    if (existing) {
      return res.status(409).json({
        code: 'ALREADY_MARKED',
        message: `Scanned for (${lecture.subject?.name || lecture.title}) Lecture`,
      });
    }

    const record = await attendanceRepo.createAttendance({
      studentId: matched.id,
      lectureId,
      status: 'present',
    });

    return res.status(201).json({
      success: true,
      message: `Marked present for ${matched.name}`,
      subjectName: lecture.subject?.name,
      student: {
        id: matched.id,
        name: matched.name,
        rollNumber: matched.rollNumber,
        department: matched.department,
      },
      scannedAt: record.scannedAt,
    });
  }
);

router.post(
  '/scan',
  body('lectureId').isUUID(),
  body('faceDescriptor').isArray({ min: 128, max: 128 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Students only' });
    }

    const student = await students.findByUserId(req.user.id);
    if (!student) return res.status(404).json({ message: 'Student profile missing' });
    if (!student.faceDescriptor || !student.faceDescriptor.length) {
      return res.status(400).json({ message: 'Face not registered. Contact admin.' });
    }

    const { lectureId, faceDescriptor } = req.body;
    const lecture = await lecturesRepo.findByIdWithSubject(lectureId);
    if (!lecture || !lecture.isActive) {
      return res.status(404).json({ message: 'Lecture not found or closed' });
    }

    const existing = await attendanceRepo.findByStudentAndLecture(student.id, lectureId);
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
      const record = await attendanceRepo.createAttendance({
        studentId: student.id,
        lectureId,
        status: 'present',
      });
      return res.status(201).json({
        success: true,
        message: `Marked present for ${lecture.subject?.name || lecture.title}`,
        subjectName: lecture.subject?.name,
        scannedAt: record.scannedAt,
      });
    } catch (e) {
      if (e.code === '23505') {
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
  let records = await attendanceRepo.listForAdmin(lectureId || null);

  if (rollNumber) {
    records = records.filter((r) => r.rollNumber === rollNumber);
  }

  res.json(
    records.map((r) => ({
      id: r.id,
      studentName: r.studentName,
      rollNumber: r.rollNumber,
      department: r.department,
      lectureTitle: r.lectureTitle,
      subjectName: r.subjectName,
      lectureAt: r.lectureAt,
      status: r.status,
      scannedAt: r.scannedAt,
    }))
  );
});

module.exports = router;
