const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    faceDescriptor: { type: [Number], default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
