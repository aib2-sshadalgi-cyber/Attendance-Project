require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { connectDb } = require('../config/db');
const User = require('../models/User');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Lecture = require('../models/Lecture');
const Attendance = require('../models/Attendance');

async function run() {
  await connectDb();

  await Attendance.deleteMany({});
  await Lecture.deleteMany({});
  await Subject.deleteMany({});
  await Student.deleteMany({});
  await User.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@123', salt);

  const admin = await User.create({
    email: 'admin@college.edu',
    passwordHash: adminHash,
    role: 'admin',
  });

  const studentDefs = [
    { email: 'alice@student.edu', name: 'Alice Johnson', roll: 'CS2024001', dept: 'Computer Science' },
    { email: 'bob@student.edu', name: 'Bob Smith', roll: 'CS2024002', dept: 'Computer Science' },
    { email: 'carol@student.edu', name: 'Carol Lee', roll: 'EE2024101', dept: 'Electrical Engineering' },
  ];

  const students = [];
  for (const s of studentDefs) {
    const h = await bcrypt.hash('Student@123', await bcrypt.genSalt(10));
    const user = await User.create({ email: s.email, passwordHash: h, role: 'student' });
    const st = await Student.create({
      user: user._id,
      name: s.name,
      rollNumber: s.roll,
      department: s.dept,
      faceDescriptor: null,
    });
    await User.updateOne({ _id: user._id }, { studentProfile: st._id });
    students.push(st);
  }

  const sub1 = await Subject.create({ name: 'Data Structures', code: 'CS201' });
  const sub2 = await Subject.create({ name: 'Digital Systems', code: 'EE205' });

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await Lecture.create({
    subject: sub1._id,
    title: 'Week 10 – Trees',
    scheduledAt: now,
    room: 'Lab A',
    isActive: true,
  });
  await Lecture.create({
    subject: sub2._id,
    title: 'Combinational Logic',
    scheduledAt: tomorrow,
    room: 'Hall 3',
    isActive: true,
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
