const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const users = require('../repos/users');
const { attachUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(attachUser(), requireAuth('admin'));

router.post(
  '/',
  body('email').isEmail().normalizeEmail(),
  body('password').isString().trim().isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const existing = await users.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const staff = await users.createUser({ email, passwordHash, role: 'scanner' });

    res.status(201).json({
      id: staff.id,
      email: staff.email,
      role: staff.role,
    });
  }
);

module.exports = router;