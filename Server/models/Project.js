const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const projectSchema = new Schema({
  name: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  gcsPdfUrl: { type: String }, // GCS URL for the PDF
  gcsAiUrl: { type: String },  // GCS URL for the AI response JSON
  model: { type: String },
  temperature: { type: Number },
  customPrompt: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Project', projectSchema);
