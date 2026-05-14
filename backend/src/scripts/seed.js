require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { connectDb, query } = require('../config/db');
const users = require('../repos/users');
const students = require('../repos/students');
const subjects = require('../repos/subjects');
const lecturesRepo = require('../repos/lectures');

async function run() {
  await connectDb();

  await query('DELETE FROM attendance');
  await query('DELETE FROM lectures');
  await query('DELETE FROM students');
  await query('DELETE FROM subjects');
  await query('DELETE FROM users');

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@123', salt);

  const admin = await users.createUser({
    email: 'admin@college.edu',
    passwordHash: adminHash,
    role: 'admin',
  });

  const studentDefs = [
    { email: 'alice@student.edu', name: 'Alice Johnson', roll: 'CS2024001', dept: 'Computer Science' },
    { email: 'bob@student.edu', name: 'Bob Smith', roll: 'CS2024002', dept: 'Computer Science' },
    { email: 'carol@student.edu', name: 'Carol Lee', roll: 'EE2024101', dept: 'Electrical Engineering' },
  ];

  for (const s of studentDefs) {
    const h = await bcrypt.hash('Student@123', await bcrypt.genSalt(10));
    const user = await users.createUser({ email: s.email, passwordHash: h, role: 'student' });
    await students.createStudent({
      userId: user.id,
      name: s.name,
      rollNumber: s.roll,
      department: s.dept,
    });
  }

  const sub1 = await subjects.createSubject({ name: 'Data Structures', code: 'CS201' });
  const sub2 = await subjects.createSubject({ name: 'Digital Systems', code: 'EE205' });

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await lecturesRepo.createLecture({
    subjectId: sub1.id,
    title: 'Week 10 – Trees',
    scheduledAt: now,
    endsAt: null,
    room: 'Lab A',
  });
  const lec2 =   await lecturesRepo.createLecture({
    subjectId: sub2.id,
    title: 'Combinational Logic',
    scheduledAt: tomorrow,
    endsAt: null,
    room: 'Hall 3',
  });

  console.log('Seed complete.');
  console.log('Admin:', admin.email, '/ Admin@123');
  console.log('Students: alice@student.edu, bob@student.edu, carol@student.edu / Student@123');
  console.log('Register faces via Admin panel before scanning (or set DISABLE_FACE_VERIFY=true for demo).');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
