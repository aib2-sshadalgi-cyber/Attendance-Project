const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    scannedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, lecture: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
