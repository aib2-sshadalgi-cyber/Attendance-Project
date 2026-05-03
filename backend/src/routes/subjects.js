const express = require('express');
const { body, validationResult } = require('express-validator');
const Subject = require('../models/Subject');
const { attachUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', attachUser(), requireAuth(['admin', 'student']), async (_req, res) => {
  const subjects = await Subject.find().sort({ code: 1 }).lean();
  res.json(subjects.map((s) => ({ id: s._id, name: s.name, code: s.code })));
});

router.use(attachUser(), requireAuth('admin'));

router.post(
  '/',
  body('name').isString().trim().notEmpty(),
  body('code').isString().trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const name = req.body.name;
    const code = String(req.body.code).toUpperCase();
    try {
      const subject = await Subject.create({ name, code });
      res.status(201).json({ id: subject._id, name: subject.name, code: subject.code });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Subject code must be unique' });
      throw e;
    }
  }
);

router.delete('/:id', async (req, res) => {
  await Subject.deleteOne({ _id: req.params.id });
  res.status(204).send();
});

module.exports = router;
