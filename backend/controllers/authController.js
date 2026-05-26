import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Yeni kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password, role } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Lütfen tüm alanları doldurun');
    }

    // 1. Kullanıcı adı regex kontrolü
    const usernameRegex = /^[a-zA-Z0-9._]{3,15}$/;
    if (!usernameRegex.test(username)) {
      res.status(400);
      throw new Error('Kullanıcı adı 3-15 karakter arasında olmalı, sadece harf, rakam, alt çizgi (_) veya nokta (.) içerebilir.');
    }

    // 2. Kullanıcı adı benzersizlik kontrolü
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      res.status(400);
      throw new Error('Bu kullanıcı adı zaten alınmış!');
    }

    // 3. E-posta regex kontrolü
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Lütfen geçerli bir e-posta adresi girin (örn: ornek@domain.com)');
    }

    // 4. E-posta benzersizlik kontrolü
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error('Bu e-posta adresi ile zaten bir hesap mevcut!');
    }

    // 5. Şifre güçlülük kontrolü
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400);
      throw new Error('Şifre en az 8 karakter uzunluğunda olmalı, en az bir büyük harf, bir küçük harf ve bir rakam içermelidir!');
    }

    const user = await User.create({
      name: name || username,
      username,
      email,
      password,
      role: role || 'Host'
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
