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
      enum: ['Host', 'Guest', 'Admin'],
      default: 'Host',
    },
    // E-posta ile şifre sıfırlama – 6 haneli OTP kodu
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },

    profilePic: {
      type: String,
      default: '',
    },

    // ── Takipçi ve Takip Edilenler ─────────────────────────────────────────
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],

    // ── Arkadaş Listesi ────────────────────────────────────────────────────
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ── Bekleyen Arkadaşlık İstekleri (gelen) ────────────────────────────
    // Bu diziye isteği GÖNDEREN kişinin _id'si eklenir.
    // Kabul edilirse friends'e taşınır, reddedilirse silinir.
    pendingFriendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ── Engellenen Kullanicilar ───────────────────────────────────────────
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    }],

    // ── Web Push Bildirimi Abonelik Verisi ────────────────────────────────
    pushSubscription: {
      type: Object,
      default: null,
    },

    isStatsPublic: {
      type: Boolean,
      default: true,
    },

    // ── Kullanıcı İstatistikleri ───────────────────────────────────────────
    stats: {
      // Toplam kaydırma sayısı (like + dislike)
      totalSwipes: {
        type: Number,
        default: 0,
      },
      // Kategori bazlı sağa kaydırma dağılımı: { yemek: 12, aktivite: 7, ... }
      categoryDistribution: {
        type: Map,
        of: Number,
        default: {},
      },
      // Kart başı ortalama karar hızı (saniye cinsinden)
      averageDecisionTime: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ─── İndeksler ──────────────────────────────────────────────────────────────
// email ve username zaten schema seviyesinde unique: true ile tanımlı
// (Mongoose bunları otomatik unique index olarak oluşturur)

// resetPasswordToken: OTP sıfırlama sorgularını hızlandırır (sparse: sadece değeri olanlarda)
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });



// Şifreyi kaydetmeden önce hashle
// NOT: Mongoose 9'da async pre hook'larda next parametresi kullanılmaz.
// Password değişmemişse (örn. token kaydı) düz return yapılır.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return; // next() yerine sadece return — Mongoose 9 uyumlu
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
