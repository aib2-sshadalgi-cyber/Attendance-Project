const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    title: { type: String, default: 'Lecture', trim: true },
    scheduledAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    room: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

lectureSchema.index({ subject: 1, scheduledAt: 1 });

module.exports = mongoose.model('Lecture', lectureSchema);
