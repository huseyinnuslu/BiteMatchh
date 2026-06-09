import User from '../models/User.js';
import Room from '../models/Room.js';

// @desc    Tüm kullanıcıları listele
// @route   GET /api/admin/users
// @access  Admin
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Kullanıcı sil
// @route   DELETE /api/admin/users/:id
// @access  Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
    if (user.role === 'Admin') {
      res.status(400);
      throw new Error('Admin kullanıcısı silinemez');
    }
    await user.deleteOne();
    res.json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    next(error);
  }
};

// @desc    Kullanıcı rolünü güncelle
// @route   PUT /api/admin/users/:id/role
// @access  Admin
export const updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
    const { role } = req.body;
    if (!['Host', 'Guest', 'Admin'].includes(role)) {
      res.status(400);
      throw new Error('Geçersiz rol');
    }
    user.role = role;
    await user.save({ validateBeforeSave: false });
    res.json({ message: 'Kullanıcı rolü güncellendi', user: { _id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    next(error);
  }
};

// @desc    Tüm odaları listele
// @route   GET /api/admin/rooms
// @access  Admin
export const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({}).populate('creator', 'username email').sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    next(error);
  }
};

// @desc    Oda sil
// @route   DELETE /api/admin/rooms/:id
// @access  Admin
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }
    await room.deleteOne();
    res.json({ message: 'Oda başarıyla silindi' });
  } catch (error) {
    next(error);
  }
};

// @desc    Sistem istatistiklerini getir
// @route   GET /api/admin/stats
// @access  Admin
export const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRooms = await Room.countDocuments();
    const guestUsers = await User.countDocuments({ role: 'Guest' });
    const hostUsers = await User.countDocuments({ role: 'Host' });
    const adminUsers = await User.countDocuments({ role: 'Admin' });
    const activeRooms = await Room.countDocuments({ status: 'active' });
    const completedRooms = await Room.countDocuments({ status: 'completed' });

    // Son 7 günde kayıt olanlar
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      totalUsers,
      totalRooms,
      guestUsers,
      hostUsers,
      adminUsers,
      activeRooms,
      completedRooms,
      newUsersThisWeek,
    });
  } catch (error) {
    next(error);
  }
};
