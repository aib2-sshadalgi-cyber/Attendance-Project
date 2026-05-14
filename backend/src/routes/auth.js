const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const users = require('../repos/users');
const students = require('../repos/students');
const { attachUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isString().trim().isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = await users.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    let student = null;
    if (user.role === 'student') {
      student = await students.findByUserId(user.id);
    }
    const token = signToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentId: student ? student.id : null,
      },
    });
  }
);

router.get('/me', attachUser(), requireAuth(['admin', 'student', 'scanner']), async (req, res) => {
  let student = null;
  if (req.user.role === 'student') {
    student = await students.findByUserId(req.user.id);
  }
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      studentId: student ? student.id : null,
    },
  });
});

module.exports = router;
