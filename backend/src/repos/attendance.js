const { query } = require('../config/db');
const lecturesRepo = require('./lectures');

async function findMonitorByLectureId(lectureId) {
  const lecture = await lecturesRepo.findByIdWithSubject(lectureId);
  if (!lecture) return null;
  const { rows } = await query(
    `SELECT st.name AS "studentName",
            st.roll_number AS "rollNumber",
            st.department AS "department",
            a.scanned_at AS "scannedAt",
            a.status
     FROM attendance a
     JOIN students st ON st.id = a.student_id
     WHERE a.lecture_id = $1
     ORDER BY a.scanned_at DESC`,
    [lectureId]
  );
  return { lecture, records: rows };
}

async function findForExport(lectureId) {
  const conds = [];
  const params = [];
  let i = 1;
  if (lectureId) {
    conds.push(`a.lecture_id = $${i++}`);
    params.push(lectureId);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT s.name AS "subjectName",
            s.code AS "subjectCode",
            l.title AS "lectureTitle",
            l.scheduled_at AS "lectureAt",
            st.name AS "studentName",
            st.roll_number AS "rollNumber",
            st.department AS "department",
            a.status,
            a.scanned_at AS "scannedAt"
     FROM attendance a
     JOIN students st ON st.id = a.student_id
     JOIN lectures l ON l.id = a.lecture_id
     JOIN subjects s ON s.id = l.subject_id
     ${where}
     ORDER BY a.scanned_at DESC`,
    params
  );
  return rows;
}

async function findMyAttendance(studentId, from, to) {
  const { rows } = await query(
    `SELECT a.status,
            a.scanned_at AS "scannedAt",
            l.title AS "lectureTitle",
            l.scheduled_at AS "lectureAt",
            s.name AS "subjectName",
            s.code AS "subjectCode"
     FROM attendance a
     JOIN lectures l ON l.id = a.lecture_id
     JOIN subjects s ON s.id = l.subject_id
     WHERE a.student_id = $1
       AND ($2::timestamptz IS NULL OR l.scheduled_at >= $2::timestamptz)
       AND ($3::timestamptz IS NULL OR l.scheduled_at <= $3::timestamptz)
     ORDER BY a.scanned_at DESC`,
    [studentId, from || null, to || null]
  );
  return rows;
}

async function findByStudentAndLecture(studentId, lectureId) {
  const { rows } = await query(
    `SELECT id, student_id AS "studentId", lecture_id AS "lectureId", status, scanned_at AS "scannedAt"
     FROM attendance WHERE student_id = $1 AND lecture_id = $2`,
    [studentId, lectureId]
  );
  return rows[0] || null;
}

async function createAttendance({ studentId, lectureId, status = 'present' }) {
  const { rows } = await query(
    `INSERT INTO attendance (student_id, lecture_id, status)
     VALUES ($1, $2, $3)
     RETURNING id, scanned_at AS "scannedAt"`,
    [studentId, lectureId, status]
  );
  return rows[0];
}

async function listForAdmin(lectureId) {
  const conds = [];
  const params = [];
  let i = 1;
  if (lectureId) {
    conds.push(`a.lecture_id = $${i++}`);
    params.push(lectureId);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT a.id,
            st.name AS "studentName",
            st.roll_number AS "rollNumber",
            st.department AS "department",
            l.title AS "lectureTitle",
            s.name AS "subjectName",
            l.scheduled_at AS "lectureAt",
            a.status,
            a.scanned_at AS "scannedAt"
     FROM attendance a
     JOIN students st ON st.id = a.student_id
     JOIN lectures l ON l.id = a.lecture_id
     JOIN subjects s ON s.id = l.subject_id
     ${where}
     ORDER BY a.scanned_at DESC`,
    params
  );
  return rows;
}

async function deleteByLectureId(lectureId) {
  await query(`DELETE FROM attendance WHERE lecture_id = $1`, [lectureId]);
}

module.exports = {
  findMonitorByLectureId,
  findForExport,
  findMyAttendance,
  findByStudentAndLecture,
  createAttendance,
  listForAdmin,
};
