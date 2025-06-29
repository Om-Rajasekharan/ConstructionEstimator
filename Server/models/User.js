const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  googleId: String,
  name: String,
  company: String,
  workspaces: [{ type: Schema.Types.ObjectId, ref: 'Workspace' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);