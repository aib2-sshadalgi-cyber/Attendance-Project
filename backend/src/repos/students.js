const { query } = require('../config/db');

function mapStudent(r) {
  if (!r) return null;
  const fd = r.face_descriptor;
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    rollNumber: r.roll_number,
    department: r.department,
    faceDescriptor: Array.isArray(fd) ? fd : null,
  };
}

async function listWithUserEmail() {
  const { rows } = await query(`
    SELECT s.id, s.user_id, s.name, s.roll_number, s.department, s.face_descriptor, u.email
    FROM students s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.roll_number ASC
  `);
  return rows.map((r) => {
    const fd = r.face_descriptor;
    const hasFace = Array.isArray(fd) && fd.length === 128;
    return {
      id: r.id,
      name: r.name,
      rollNumber: r.roll_number,
      department: r.department,
      email: r.email,
      hasFace,
    };
  });
}

async function listRegisteredWithFaces() {
  const { rows } = await query(`
    SELECT s.id, s.user_id, s.name, s.roll_number, s.department, s.face_descriptor, u.email
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.face_descriptor IS NOT NULL
    ORDER BY s.roll_number ASC
  `);

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    rollNumber: r.roll_number,
    department: r.department,
    email: r.email,
    faceDescriptor: Array.isArray(r.face_descriptor) ? r.face_descriptor : null,
  }));
}

async function findByRollNumber(rollNumber) {
  const { rows } = await query(
    `SELECT id, user_id, name, roll_number, department, face_descriptor FROM students WHERE roll_number = $1`,
    [rollNumber]
  );
  return mapStudent(rows[0]);
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, user_id, name, roll_number, department, face_descriptor FROM students WHERE id = $1`,
    [id]
  );
  return mapStudent(rows[0]);
}

async function findByIdWithUser(id) {
  const { rows } = await query(
    `SELECT s.id, s.user_id, s.name, s.roll_number, s.department, s.face_descriptor, u.email
     FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  return { ...mapStudent(rows[0]), email: rows[0].email };
}

async function findByUserId(userId) {
  const { rows } = await query(
    `SELECT id, user_id, name, roll_number, department, face_descriptor FROM students WHERE user_id = $1`,
    [userId]
  );
  return mapStudent(rows[0]);
}

async function createStudent({ userId, name, rollNumber, department }, client = null) {
  const run = client ? (t, p) => client.query(t, p) : query;
  const { rows } = await run(
    `INSERT INTO students (user_id, name, roll_number, department)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, name, roll_number, department, face_descriptor`,
    [userId, name, rollNumber, department]
  );
  return mapStudent(rows[0]);
}

async function updateStudent(id, { name, rollNumber, department }) {
  const { rows } = await query(
    `UPDATE students SET
       name = COALESCE($2, name),
       roll_number = COALESCE($3, roll_number),
       department = COALESCE($4, department),
       updated_at = now()
     WHERE id = $1
     RETURNING id, user_id, name, roll_number, department, face_descriptor`,
    [id, name ?? null, rollNumber ?? null, department ?? null]
  );
  return mapStudent(rows[0]);
}

async function setFaceDescriptor(id, faceDescriptor) {
  await query(`UPDATE students SET face_descriptor = $2::jsonb, updated_at = now() WHERE id = $1`, [
    id,
    JSON.stringify(faceDescriptor),
  ]);
}

module.exports = {
  listWithUserEmail,
  listRegisteredWithFaces,
  findByRollNumber,
  findById,
  findByIdWithUser,
  findByUserId,
  createStudent,
  updateStudent,
  setFaceDescriptor,
};
