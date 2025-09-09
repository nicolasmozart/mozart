const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  externalMeetingId: {
    type: String,
    required: false
  },
  meetingData: {
    type: Object,
    required: true
  },
  attendees: [{
    type: Object
  }],
  transcriptionEnabled: {
    type: Boolean,
    default: false
  },
  pipelineId: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['created', 'active', 'ended', 'expired'],
    default: 'created'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', MeetingSchema);
