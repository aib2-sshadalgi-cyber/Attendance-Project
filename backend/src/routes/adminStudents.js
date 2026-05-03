const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const { attachUser, requireAuth } = require('../middleware/auth');
const { isValidDescriptor } = require('../utils/faceMatch');

const router = express.Router();

router.use(attachUser(), requireAuth('admin'));

router.get('/', async (_req, res) => {
  const students = await Student.find().populate('user', 'email').sort({ rollNumber: 1 }).lean();
  const list = students.map((s) => ({
    id: s._id,
    name: s.name,
    rollNumber: s.rollNumber,
    department: s.department,
    email: s.user?.email,
    hasFace: Array.isArray(s.faceDescriptor) && s.faceDescriptor.length === 128,
  }));
  res.json(list);
});

router.post(
  '/',
  body('email').isEmail().normalizeEmail(),
  body('password').isString().trim().isLength({ min: 6 }),
  body('name').isString().trim().notEmpty(),
  body('rollNumber').isString().trim().notEmpty(),
  body('department').isString().trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, name, rollNumber, department } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const rollTaken = await Student.findOne({ rollNumber });
    if (rollTaken) return res.status(409).json({ message: 'Roll number already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await User.create({ email, passwordHash, role: 'student' });
    const student = await Student.create({ user: user._id, name, rollNumber, department });
    await User.updateOne({ _id: user._id }, { studentProfile: student._id });

    res.status(201).json({
      id: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      email: user.email,
    });
  }
);

router.patch(
  '/:id/register-face',
  param('id').isMongoId(),
  body('faceDescriptor').isArray({ min: 128, max: 128 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { faceDescriptor } = req.body;
    if (!isValidDescriptor(faceDescriptor)) {
      return res.status(400).json({ message: 'Invalid face descriptor (must be 128 finite numbers)' });
    }
    student.faceDescriptor = faceDescriptor;
    await student.save();
    res.json({ message: 'Face registered', studentId: student._id });
  }
);

router.patch(
  '/:id',
  param('id').isMongoId(),
  body('name').optional().isString().trim().notEmpty(),
  body('rollNumber').optional().isString().trim().notEmpty(),
  body('department').optional().isString().trim().notEmpty(),
  body('password').optional().isString().trim().isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (req.body.rollNumber && req.body.rollNumber !== student.rollNumber) {
      const taken = await Student.findOne({ rollNumber: req.body.rollNumber });
      if (taken) return res.status(409).json({ message: 'Roll number already exists' });
      student.rollNumber = req.body.rollNumber;
    }
    if (req.body.name) student.name = req.body.name;
    if (req.body.department) student.department = req.body.department;
    await student.save();

    if (req.body.password) {
      const user = await User.findById(student.user);
      if (user) {
        user.passwordHash = await bcrypt.hash(req.body.password, await bcrypt.genSalt(10));
        await user.save();
      }
    }
    const populated = await Student.findById(student._id).populate('user', 'email').lean();
    res.json({
      id: populated._id,
      name: populated.name,
      rollNumber: populated.rollNumber,
      department: populated.department,
      email: populated.user?.email,
    });
  }
);

router.delete('/:id', param('id').isMongoId(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  await User.deleteOne({ _id: student.user });
  await Student.deleteOne({ _id: student._id });
  res.status(204).send();
});

module.exports = router;
