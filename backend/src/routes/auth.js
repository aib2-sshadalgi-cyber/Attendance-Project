const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    let student = null;
    if (user.role === 'student') {
      student = await Student.findOne({ user: user._id }).lean();
    }
    const token = signToken(user._id.toString());
    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        studentId: student ? student._id : null,
      },
    });
  }
);

router.get('/me', attachUser(), requireAuth(['admin', 'student']), async (req, res) => {
  let student = null;
  if (req.user.role === 'student') {
    student = await Student.findOne({ user: req.user._id }).lean();
  }
  return res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      studentId: student ? student._id : null,
    },
  });
});

module.exports = router;
