const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const users = require('../repos/users');
const students = require('../repos/students');
const { withTransaction } = require('../config/db');
const { attachUser, requireAuth } = require('../middleware/auth');
const { isValidDescriptor } = require('../utils/faceMatch');

const router = express.Router();

router.use(attachUser(), requireAuth('admin'));

router.get('/', async (_req, res) => {
  const list = await students.listWithUserEmail();
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
    const existing = await users.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const rollTaken = await students.findByRollNumber(rollNumber);
    if (rollTaken) return res.status(409).json({ message: 'Roll number already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    try {
      const { user, student } = await withTransaction(async (client) => {
        const userRow = await users.createUser(
          { email, passwordHash, role: 'student' },
          client
        );
        const studentRow = await students.createStudent(
          { userId: userRow.id, name, rollNumber, department },
          client
        );
        return { user: userRow, student: studentRow };
      });

      res.status(201).json({
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department,
        email: user.email,
      });
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ message: 'Email or roll number already exists' });
      }
      throw e;
    }
  }
);

router.patch(
  '/:id/register-face',
  param('id').isUUID(),
  body('faceDescriptor').isArray({ min: 128, max: 128 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const student = await students.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { faceDescriptor } = req.body;
    if (!isValidDescriptor(faceDescriptor)) {
      return res.status(400).json({ message: 'Invalid face descriptor (must be 128 finite numbers)' });
    }
    await students.setFaceDescriptor(student.id, faceDescriptor);
    res.json({ message: 'Face registered', studentId: student.id });
  }
);

router.patch(
  '/:id',
  param('id').isUUID(),
  body('name').optional().isString().trim().notEmpty(),
  body('rollNumber').optional().isString().trim().notEmpty(),
  body('department').optional().isString().trim().notEmpty(),
  body('password').optional().isString().trim().isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const student = await students.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (req.body.rollNumber && req.body.rollNumber !== student.rollNumber) {
      const taken = await students.findByRollNumber(req.body.rollNumber);
      if (taken) return res.status(409).json({ message: 'Roll number already exists' });
    }

    await students.updateStudent(student.id, {
      name: req.body.name !== undefined ? req.body.name : null,
      rollNumber: req.body.rollNumber !== undefined ? req.body.rollNumber : null,
      department: req.body.department !== undefined ? req.body.department : null,
    });

    if (req.body.password) {
      const user = await users.findById(student.userId);
      if (user) {
        await users.updatePassword(user.id, await bcrypt.hash(req.body.password, await bcrypt.genSalt(10)));
      }
    }
    const populated = await students.findByIdWithUser(student.id);
    res.json({
      id: populated.id,
      name: populated.name,
      rollNumber: populated.rollNumber,
      department: populated.department,
      email: populated.email,
    });
  }
);

router.delete('/:id', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const student = await students.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  await users.deleteById(student.userId);
  res.status(204).send();
});

module.exports = router;
