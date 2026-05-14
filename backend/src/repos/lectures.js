const { query } = require('../config/db');

async function listLectures({ subjectId, from, to, activeOnly, studentOnlyActive }) {
  const conds = [];
  const params = [];
  let i = 1;
  if (subjectId) {
    conds.push(`l.subject_id = $${i++}`);
    params.push(subjectId);
  }
  if (from) {
    conds.push(`l.scheduled_at >= $${i++}`);
    params.push(from);
  }
  if (to) {
    conds.push(`l.scheduled_at <= $${i++}`);
    params.push(to);
  }
  if (activeOnly === 'true' || activeOnly === true) {
    conds.push(`l.is_active = true`);
  }
  if (studentOnlyActive) {
    conds.push(`l.is_active = true`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT l.id,
            l.subject_id AS "subjectId",
            l.title,
            l.scheduled_at AS "scheduledAt",
            l.ends_at AS "endsAt",
            l.room,
            l.is_active AS "isActive",
            s.name AS "subjectName",
            s.code AS "subjectCode"
     FROM lectures l
     JOIN subjects s ON s.id = l.subject_id
     ${where}
     ORDER BY l.scheduled_at DESC`,
    params
  );
  return rows;
}

async function findByIdWithSubject(id) {
  const { rows } = await query(
    `SELECT l.id,
            l.subject_id AS "subjectId",
            l.title,
            l.scheduled_at AS "scheduledAt",
            l.ends_at AS "endsAt",
            l.room,
            l.is_active AS "isActive",
            s.id AS "subject_id",
            s.name AS "subjectName",
            s.code AS "subjectCode"
     FROM lectures l
     JOIN subjects s ON s.id = l.subject_id
     WHERE l.id = $1`,
    [id]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    subjectId: r.subjectId,
    title: r.title,
    scheduledAt: r.scheduledAt,
    endsAt: r.endsAt,
    room: r.room,
    isActive: r.isActive,
    subject: { id: r.subjectId, name: r.subjectName, code: r.subjectCode },
  };
}

async function createLecture({ subjectId, title, scheduledAt, endsAt, room }) {
  const { rows } = await query(
    `INSERT INTO lectures (subject_id, title, scheduled_at, ends_at, room)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [subjectId, title || 'Lecture', scheduledAt, endsAt || null, room || '']
  );
  return findByIdWithSubject(rows[0].id);
}

async function updateLecture(id, patch) {
  const parts = [];
  const vals = [];
  let i = 1;
  if (typeof patch.isActive === 'boolean') {
    parts.push(`is_active = $${i++}`);
    vals.push(patch.isActive);
  }
  if (patch.title != null && patch.title !== '') {
    parts.push(`title = $${i++}`);
    vals.push(patch.title);
  }
  if (patch.scheduledAt != null) {
    parts.push(`scheduled_at = $${i++}`);
    vals.push(patch.scheduledAt);
  }
  if (patch.endsAt !== undefined) {
    parts.push(`ends_at = $${i++}`);
    vals.push(patch.endsAt);
  }
  if (patch.room !== undefined) {
    parts.push(`room = $${i++}`);
    vals.push(patch.room);
  }
  if (!parts.length) {
    return findByIdWithSubject(id);
  }
  parts.push('updated_at = now()');
  vals.push(id);
  const idParam = vals.length;
  const { rowCount } = await query(
    `UPDATE lectures SET ${parts.join(', ')} WHERE id = $${idParam}`,
    vals
  );
  if (!rowCount) return null;
  return findByIdWithSubject(id);
}

async function deleteById(id) {
  await query(`DELETE FROM lectures WHERE id = $1`, [id]);
}

module.exports = {
  listLectures,
  findByIdWithSubject,
  createLecture,
  updateLecture,
  deleteById,
};
