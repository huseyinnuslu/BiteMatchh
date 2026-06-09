import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Yeni kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password, role, securityQuestion, securityAnswer } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Lütfen tüm alanları doldurun');
    }

    // 1. Güvenlik sorusu kontrolü
    if (!securityQuestion || !securityAnswer) {
      res.status(400);
      throw new Error('Güvenlik sorusu ve cevabı zorunludur');
    }

    if (securityAnswer.trim().length < 2) {
      res.status(400);
      throw new Error('Güvenlik cevabı en az 2 karakter olmalıdır');
    }

    // 2. Kullanıcı adı regex kontrolü
    const usernameRegex = /^[a-zA-Z0-9._]{3,15}$/;
    if (!usernameRegex.test(username)) {
      res.status(400);
      throw new Error('Kullanıcı adı 3-15 karakter arasında olmalı, sadece harf, rakam, alt çizgi (_) veya nokta (.) içerebilir.');
    }

    // 3. Kullanıcı adı benzersizlik kontrolü
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      res.status(400);
      throw new Error('Bu kullanıcı adı zaten alınmış!');
    }

    // 4. E-posta regex kontrolü
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Lütfen geçerli bir e-posta adresi girin (örn: ornek@domain.com)');
    }

    // 5. E-posta benzersizlik kontrolü
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error('Bu e-posta adresi ile zaten bir hesap mevcut!');
    }

    // 6. Şifre güçlülük kontrolü
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400);
      throw new Error('Şifre en az 8 karakter uzunluğunda olmalı, en az bir büyük harf, bir küçük harf ve bir rakam içermelidir!');
    }

    // Güvenlik cevabını küçük harfe normalize et (büyük/küçük harf duyarsız)
    const normalizedAnswer = securityAnswer.trim().toLowerCase();

    const user = await User.create({
      name: name || username,
      username,
      email,
      password,
      role: role || 'Host',
      securityQuestion,
      securityAnswer: normalizedAnswer,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Geçersiz kullanıcı verisi');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Kullanıcı girişi & Token alma
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

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
      throw new Error('Geçersiz email veya şifre');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Misafir girişi yap (DB'de geçici kullanıcı oluşturup JWT döner)
// @route   POST /api/auth/guest
// @access  Public
export const guestLogin = async (req, res, next) => {
  try {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const username = `Misafir_${randomNum}`;
    const email = `guest_${randomNum}@bitematch.com`;
    const password = `guest_pass_${randomNum}`; // Geçici şifre

    const user = await User.create({
      name: username,
      username,
      email,
      password,
      role: 'Guest'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
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

// @desc    Kullanıcı profilini güncelle
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
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

// @desc    E-postaya ait güvenlik sorusunu getir
// @route   POST /api/auth/security-question
// @access  Public
export const getSecurityQuestion = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error('E-posta adresi zorunludur');
    }

    const user = await User.findOne({ email }).select('securityQuestion username');
    if (!user) {
      res.status(404);
      throw new Error('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı');
    }

    if (!user.securityQuestion) {
      res.status(400);
      throw new Error('Bu hesap için güvenlik sorusu tanımlanmamış');
    }

    res.json({ securityQuestion: user.securityQuestion, username: user.username });
  } catch (error) {
    next(error);
  }
};

// @desc    Güvenlik sorusu ile şifre sıfırla
// @route   POST /api/auth/reset-with-answer
// @access  Public
export const resetPasswordWithAnswer = async (req, res, next) => {
  try {
    const { email, securityAnswer, newPassword } = req.body;

    if (!email || !securityAnswer || !newPassword) {
      res.status(400);
      throw new Error('Tüm alanlar zorunludur');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı');
    }

    // Güvenlik cevabını karşılaştır (normalize ederek)
    const normalizedInput = securityAnswer.trim().toLowerCase();
    if (normalizedInput !== user.securityAnswer) {
      res.status(401);
      throw new Error('Güvenlik sorusu cevabı yanlış!');
    }

    // Yeni şifre güçlülük kontrolü
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400);
      throw new Error('Yeni şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir!');
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Şifreniz başarıyla güncellendi!',
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

// @desc    Şifre sıfırlama emaili gönder
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı');
    }

    // Sıfırlama token'ı üret
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 dakika
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"BiteMatch" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'BiteMatch - Şifre Sıfırlama',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #eee; padding: 40px; border-radius: 12px;">
          <h1 style="color: #ff6b6b; text-align: center;">🍽️ BiteMatch</h1>
          <h2 style="text-align: center;">Şifre Sıfırlama</h2>
          <p>Merhaba <strong>${user.username}</strong>,</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu link <strong>15 dakika</strong> süreyle geçerlidir.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Şifremi Sıfırla
            </a>
          </div>
          <p style="color: #aaa; font-size: 13px;">Bu isteği siz yapmadıysanız bu emaili görmezden gelebilirsiniz.</p>
          <p style="color: #aaa; font-size: 13px;">Link çalışmıyorsa şu adresi kopyalayın: ${resetUrl}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Şifre sıfırlama emaili gönderildi! Lütfen gelen kutunuzu kontrol edin.' });
  } catch (error) {
    // Hata olursa token'ları temizle
    if (error.name !== 'Error') {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }
    next(error);
  }
};

// @desc    Şifreyi sıfırla
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Geçersiz veya süresi dolmuş token. Lütfen yeni bir şifre sıfırlama isteği gönderin.');
    }

    // Yeni şifreyi kaydet
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      res.status(400);
      throw new Error('Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir!');
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
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
