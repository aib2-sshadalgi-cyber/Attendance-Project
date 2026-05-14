const express = require('express');
const { body, validationResult } = require('express-validator');
const subjects = require('../repos/subjects');
const { attachUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', attachUser(), requireAuth(['admin', 'student']), async (_req, res) => {
  const rows = await subjects.listAll();
  res.json(rows.map((s) => ({ id: s.id, name: s.name, code: s.code })));
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
      const subject = await subjects.createSubject({ name, code });
      res.status(201).json({ id: subject.id, name: subject.name, code: subject.code });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ message: 'Subject code must be unique' });
      throw e;
    }
  }
);

router.delete('/:id', async (req, res) => {
  await subjects.deleteById(req.params.id);
  res.status(204).send();
});

module.exports = router;
