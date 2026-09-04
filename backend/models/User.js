// models/User.js
// A person interacting with the platform — either someone reporting an item
// or a security account. No login system yet, so email is the identity key.

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      minlength: 3,
      trim: true,
      lowercase: true,
    },
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minlength: 8 },
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['reporter', 'security', 'admin'],
      default: 'reporter',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const bcrypt = require('bcryptjs');

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(10));
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return this.password ? bcrypt.compare(candidatePassword, this.password) : false;
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
