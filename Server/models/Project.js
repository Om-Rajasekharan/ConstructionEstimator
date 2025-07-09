const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const projectSchema = new Schema({
  name: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  files: [
    {
      name: { type: String, required: true },
      type: { type: String },
      gcsUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      metadata: { type: Object },
    }
  ],
  gcsAiUrl: { type: String }, 
  model: { type: String },
  temperature: { type: Number },
  customPrompt: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Project', projectSchema);
