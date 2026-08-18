import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id).select('-password');

      // Kullanıcı hesabı silinmiş ancak tarayıcıda eski JWT kalmış olabilir.
      // Bu durumda isteği boş bir req.user ile controller'a göndermek 500
      // hatasına neden olur. Oturumu geçersiz sayıp istemcinin güvenle
      // yeniden giriş akışına dönmesini sağlarız.
      if (!user) {
        res.status(401);
        return next(new Error('Oturum geçersiz. Lütfen tekrar giriş yapın.'));
      }

      req.user = user;
      return next();
    } catch (error) {
      res.status(401);
      next(new Error('Yetkisiz erişim, token geçersiz'));
    }
  }

  if (!token) {
    res.status(401);
    next(new Error('Yetkisiz erişim, token bulunamadı'));
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403);
    next(new Error('Bu işlem için Admin yetkisi gereklidir'));
  }
};
