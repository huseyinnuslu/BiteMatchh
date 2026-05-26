import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: [true, 'Kullanıcı adı zorunludur'],
      unique: true,
      match: [
        /^[a-zA-Z0-9._]{3,15}$/,
        'Kullanıcı adı 3-15 karakter arasında olmalı, sadece harf, rakam, alt çizgi (_) veya nokta (.) içerebilir.',
      ],
    },
    email: {
      type: String,
      required: [true, 'E-posta adresi zorunludur'],
      unique: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Lütfen geçerli bir e-posta adresi girin (örn: ornek@domain.com)',
      ],
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['Host', 'Guest'],
      default: 'Host',
    },
  },
  {
    timestamps: true,
  }
);

// Şifreyi kaydetmeden önce hashle
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  if (!this.username) {
    this.username = this.name;
  }
});

// Şifre doğrulama metodu
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
