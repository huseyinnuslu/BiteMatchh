import nodemailer from 'nodemailer';
import { resolve4 } from 'node:dns/promises';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// ─── Google OAuth2 client ───────────────────────────────────────────────────
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Yardımcı: 6 haneli OTP üret ───────────────────────────────────────────
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ─── Yardımcı: Nodemailer transporter ──────────────────────────────────────
const createTransporter = async () => {
  // Nodemailer kendi DNS fallback mekanizmasında IPv6'yı da deneyebiliyor.
  // Render'ın IPv6 çıkışı olmadığı için SMTP ana bilgisayarını özellikle A kaydından alıyoruz.
  const [smtpIpv4] = await resolve4('smtp.gmail.com');

  if (!smtpIpv4) {
    throw new Error('Gmail SMTP için IPv4 adresi bulunamadı');
  }

  return nodemailer.createTransport({
    host: smtpIpv4,
    port: 465,
    secure: true,
    tls: { servername: 'smtp.gmail.com' },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Kayıt akışını e-posta sağlayıcısına bağımlı bırakmadan, yalnızca yeni
// gerçek kullanıcılara hoş geldin e-postası gönderir.
const sendWelcomeEmail = async (user) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !user?.email) {
    console.warn('Hoş geldin e-postası atlandı: e-posta yapılandırması eksik.');
    return false;
  }

  const username = escapeHtml(user.username || user.name || 'BiteMatch kullanıcısı');
  const appUrl = process.env.FRONTEND_URL || 'https://bite-matchh.vercel.app';

  try {
    const transporter = await createTransporter();
    await transporter.sendMail({
      from: `"BiteMatch 🍽️" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "BiteMatch'e Hoş Geldin! 🎉",
      text: `Merhaba ${user.username || user.name},\n\nBiteMatch ailesine katıldığın için çok mutluyuz! Artık arkadaş grubunla "Bana Fark Etmez Ya!" krizlerine son verebilirsin.\n\nUygulamayı hemen incelemeye başlayabilir, odanı kurup arkadaşlarınla eşleşmenin tadını çıkarabilirsin.\n\nKeyifli eşleşmeler dileriz!\nBiteMatch Ekibi`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 36px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 34px; margin-bottom: 8px;">🍽️</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">BiteMatch'e Hoş Geldin! 🎉</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.7; margin: 0 0 18px;">Merhaba <strong>${username}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.7; margin: 0 0 18px;">BiteMatch ailesine katıldığın için çok mutluyuz! Artık arkadaş grubunla <strong>“Bana Fark Etmez Ya!”</strong> krizlerine son verebilirsin.</p>
          <p style="font-size: 16px; line-height: 1.7; margin: 0 0 28px;">Uygulamayı hemen incelemeye başlayabilir, odanı kurup arkadaşlarınla eşleşmenin tadını çıkarabilirsin.</p>
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${appUrl}" style="display: inline-block; padding: 13px 22px; border-radius: 10px; background: #ff4b4b; color: #ffffff; text-decoration: none; font-weight: 700;">BiteMatch'i Keşfet</a>
          </div>
          <p style="font-size: 16px; line-height: 1.7; margin: 0;">Keyifli eşleşmeler dileriz!<br/><strong>BiteMatch Ekibi</strong></p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    // E-posta hatası kaydı veya Google kaydını geri almamalı.
    console.error('Hoş geldin e-postası gönderilemedi:', error.message);
    return false;
  }
};

const sendWelcomeEmailIfNeeded = async (user) => {
  if (!user || user.welcomeEmailSentAt) {
    return;
  }

  const sent = await sendWelcomeEmail(user);
  if (sent) {
    user.welcomeEmailSentAt = new Date();
    await user.save({ validateBeforeSave: false });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Yeni kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
// Optimizasyon: 2 ayrı findOne yerine tek $or sorgusu (1 DB round-trip tasarrufu)
// ──────────────────────────────────────────────────────────────────────────────
export const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password, role } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Lutfen tum alanlari doldurun');
    }

    // Kullanici adi regex kontrolu (DB'ye gitmeden once)
    const usernameRegex = /^[a-zA-Z0-9._]{3,15}$/;
    if (!usernameRegex.test(username)) {
      res.status(400);
      throw new Error(
        'Kullanici adi 3-15 karakter olmali, harf/rakam/alt cizgi/nokta icermeli.'
      );
    }

    // Sifre guclukluk kontrolu (DB'ye gitmeden once)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400);
      throw new Error(
        'Sifre en az 8 karakter, 1 buyuk harf, 1 kucuk harf ve 1 rakam icermeli!'
      );
    }

    // TEK sorguyla hem username hem email cakismasini kontrol et
    const existing = await User.findOne(
      {
        $or: [
          { email },
          { $expr: { $eq: [{ $toLower: '$username' }, username.toLowerCase()] } },
        ],
      },
      'username email'
    ).lean();

    if (existing) {
      res.status(400);
      throw new Error(
        existing.email === email
          ? 'Bu e-posta adresi ile zaten bir hesap mevcut!'
          : 'Bu kullanici adi zaten alinmis!'
      );
    }

    const user = await User.create({
      name: name || username,
      username,
      email,
      password,
      role: role || 'Host',
    });

    // E-posta teslimatı kayıt yanıtını geciktirmemeli.
    void sendWelcomeEmailIfNeeded(user);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanici girisi & Token alma
// @route   POST /api/auth/login
// @access  Public
// Optimizasyon: select() ile sadece gerekli alanlar cekilir
// ──────────────────────────────────────────────────────────────────────────────
export const loginUser = async (req, res, next) => {
  try {
    // identifier: e-posta VEYA kullanici adi kabul edilir
    const { email, identifier, password } = req.body;
    const loginId = identifier || email;

    if (!loginId || !password) {
      res.status(400);
      throw new Error('E-posta/kullanici adi ve sifre zorunludur');
    }

    // $or sorgusu: hem email hem username ile eslisir
    const user = await User.findOne({
      $or: [{ email: loginId }, { username: loginId }],
    }).select('_id name username email role password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Gecersiz e-posta/kullanici adi veya sifre');
    }
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Misafir girişi (geçici kullanıcı oluştur)
// @route   POST /api/auth/guest
// @access  Public
// ──────────────────────────────────────────────────────────────────────────────
export const guestLogin = async (req, res, next) => {
  try {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const username = `Misafir_${randomNum}`;
    const email = `guest_${randomNum}@bitematch.com`;
    const password = `guest_pass_${randomNum}`;

    const user = await User.create({
      name: username,
      username,
      email,
      password,
      role: 'Guest',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Misafir kullanıcısı oluşturulamadı');
    }
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanıcı profilini güncelle
// @route   PUT /api/auth/profile
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      const isUsernameUpdateRequested = Object.prototype.hasOwnProperty.call(req.body, 'username');

      if (isUsernameUpdateRequested) {
        const requestedUsername = typeof req.body.username === 'string'
          ? req.body.username.trim()
          : '';
        const usernameRegex = /^[a-zA-Z0-9._]{3,15}$/;

        if (!usernameRegex.test(requestedUsername)) {
          res.status(400);
          throw new Error('Kullanici adi 3-15 karakter olmali; sadece harf, rakam, alt cizgi ve nokta icerebilir.');
        }

        if (requestedUsername !== user.username) {
          const now = Date.now();
          const previousChangeAt = user.usernameChangedAt?.getTime();

          if (previousChangeAt && now - previousChangeAt < 7 * 24 * 60 * 60 * 1000) {
            const remainingDays = Math.ceil((7 * 24 * 60 * 60 * 1000 - (now - previousChangeAt)) / (24 * 60 * 60 * 1000));
            res.status(429);
            throw new Error('Kullanici adinizi ' + remainingDays + ' gun sonra tekrar degistirebilirsiniz.');
          }

          const existingUsername = await User.findOne({
            _id: { $ne: user._id },
            $expr: { $eq: [{ $toLower: '$username' }, requestedUsername.toLowerCase()] },
          }).select('_id').lean();

          if (existingUsername) {
            res.status(409);
            throw new Error('Bu kullanici adi zaten alinmis. Lutfen baska bir ad deneyin.');
          }

          user.username = requestedUsername;
          user.usernameChangedAt = new Date(now);
        }
      }

      user.email = req.body.email || user.email;

      if (req.body.isStatsPublic !== undefined) {
        user.isStatsPublic = req.body.isStatsPublic;
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePic: updatedUser.profilePic,
        isStatsPublic: updatedUser.isStatsPublic,
        usernameChangedAt: updatedUser.usernameChangedAt,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Şifre sıfırlama – Adım 1: E-postaya 6 haneli OTP gönder
// @route   POST /api/auth/forgot-password
// @access  Public
// ──────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('E-posta adresi zorunludur');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı');
    }

    // 6 haneli OTP kodu üret ve hash'le
    const otp = generateOTP();
    const hashedOtp = otp; // Düz metin saklıyoruz (kısa süreli)
    user.resetPasswordToken = hashedOtp;
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika
    await user.save({ validateBeforeSave: false });

    // Gmail ile gönder
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"BiteMatch 🍽️" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'BiteMatch – Şifre Sıfırlama Kodu',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px 36px; border-radius: 16px; border: 1px solid #1e293b;">
          
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #ff4b4b; font-size: 28px; margin: 0 0 8px;">🍽️ BiteMatch</h1>
            <p style="color: #94a3b8; margin: 0; font-size: 14px;">Grup Karar Motoru</p>
          </div>

          <h2 style="font-size: 20px; margin: 0 0 12px; color: #f1f5f9;">Şifre Sıfırlama Kodu</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 28px;">
            Merhaba <strong style="color: #fff;">${user.username}</strong>,<br/>
            Şifre sıfırlama talebinde bulundunuz. Aşağıdaki <strong>6 haneli kodu</strong> uygulamaya girin.
            Bu kod <strong style="color: #ff4b4b;">10 dakika</strong> içinde geçerliliğini yitirecektir.
          </p>

          <div style="background: #1e293b; border: 2px dashed #ff4b4b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px; letter-spacing: 2px; text-transform: uppercase;">Doğrulama Kodunuz</p>
            <p style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #ff4b4b; margin: 0; font-family: 'Courier New', monospace;">${otp}</p>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0; border-top: 1px solid #1e293b; padding-top: 20px;">
            Bu isteği siz yapmadıysanız bu e-postayı güvenle görmezden gelebilirsiniz. 
            Hesabınız güvende olmaya devam edecektir.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: `Doğrulama kodu ${email} adresine gönderildi. 10 dakika içinde girmeniz gerekmektedir.`,
    });
  } catch (error) {
    // Mail gönderilemezse token'ı temizle
    try {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
      }
    } catch (_) {}
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Şifre sıfırlama – Adım 2: OTP kodunu ve yeni şifreyi doğrula
// @route   POST /api/auth/reset-password
// @access  Public
// ──────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400);
      throw new Error('E-posta, doğrulama kodu ve yeni şifre zorunludur');
    }

    // OTP ve süre kontrolü
    const user = await User.findOne({
      email,
      resetPasswordToken: otp,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error(
        'Doğrulama kodu hatalı veya süresi dolmuş. Lütfen yeni kod isteyin.'
      );
    }

    // Şifre güçlülük kontrolü
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400);
      throw new Error(
        'Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir!'
      );
    }

    // Yeni şifreyi kaydet, token'ları temizle
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      message: 'Şifreniz başarıyla güncellendi! Giriş yapabilirsiniz.',
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Google OAuth2 ile giriş / kayıt
// @route   POST /api/auth/google-login
// @access  Public
// Frontend: useGoogleLogin (access_token flow) → Google UserInfo → bu endpoint
// ──────────────────────────────────────────────────────────────────────────────
export const googleLogin = async (req, res, next) => {
  try {
    const { accessToken, userInfo } = req.body;

    if (!accessToken || !userInfo) {
      res.status(400);
      throw new Error('Google token veya kullanıcı bilgisi eksik');
    }

    // Google access_token'ı doğrula: token'ı Google'ın tokeninfo endpoint'ine gönder
    const tokenInfoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
    );
    const tokenInfo = await tokenInfoRes.json();

    if (tokenInfo.error) {
      res.status(401);
      throw new Error('Geçersiz Google token');
    }

    // userInfo'dan güvenli şekilde bilgileri al
    const { email, name, sub: googleId } = userInfo;

    if (!email) {
      res.status(400);
      throw new Error('Google hesabından e-posta alınamadı');
    }

    // Veritabanında bu e-posta var mı?
    let user = await User.findOne({ email });

    if (user) {
      // İlk kayıt denemesinde e-posta gönderilemediyse, Google ile sonraki girişte tekrar dener.
      // Bu işlem giriş ekranını asla bekletmez.
      void sendWelcomeEmailIfNeeded(user);

      // ── Mevcut kullanıcı: direkt JWT ver
      return res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }

    // ── Yeni kullanıcı: Google bilgileriyle kayıt oluştur
    let baseUsername = (name || email.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '_')
      .slice(0, 12);

    // Benzersizlik kontrolü – çakışırsa sonuna sayı ekle
    let username = baseUsername;
    let suffix = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    // Google ile kayıt olan kullanıcılar için rastgele güçlü şifre
    // (kullanıcı bu şifreyi bilmez; giriş sadece Google ile yapılır)
    const uid = googleId || Math.random().toString(36).slice(2, 10);
    const randomPassword = `Gx${uid.slice(0, 8)}!${Math.random().toString(36).slice(2, 8)}Aa1`;

    user = await User.create({
      name: name || username,
      username,
      email,
      password: randomPassword,
      role: 'Host',
    });

    // E-posta teslimatı Google girişini bekletmemeli.
    void sendWelcomeEmailIfNeeded(user);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};
