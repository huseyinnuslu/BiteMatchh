import User from '../models/User.js';
import Room from '../models/Room.js';
import Candidate from '../models/Candidate.js';
import Message from '../models/Message.js';
import Swipe from '../models/Swipe.js';
import https from 'https';
import http  from 'http';

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

// @desc    Birden fazla kullanıcı sil
// @route   DELETE /api/admin/users/bulk
// @access  Admin
export const bulkDeleteUsers = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400);
      throw new Error('Geçersiz kullanıcı ID listesi');
    }

    // Seçilen kullanıcıların admin olmayanlarını bul
    const usersToDelete = await User.find({ _id: { $in: ids }, role: { $ne: 'Admin' } });
    const userIds = usersToDelete.map(u => u._id);

    if (userIds.length > 0) {
      await User.deleteMany({ _id: { $in: userIds } });
      await Room.deleteMany({ host: { $in: userIds } });
      await Message.deleteMany({ sender: { $in: userIds } });
      await Swipe.deleteMany({ user: { $in: userIds } });
    }

    res.json({ message: `${userIds.length} kullanıcı başarıyla silindi.` });
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
// Optimizasyon: populate sadece zorunlu alanlar, .lean() ile bellek tasarrufu
export const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({})
      .populate('host', 'username')
      .select('name status category createdAt host participants timeLimit')
      .sort({ createdAt: -1 })
      .lean();
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
    const room = await Room.findById(req.params.id).select('_id');
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

// @desc    Birden fazla oda sil
// @route   DELETE /api/admin/rooms/bulk
// @access  Admin
export const bulkDeleteRooms = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400);
      throw new Error('Geçersiz oda ID listesi');
    }

    await Room.deleteMany({ _id: { $in: ids } });
    await Message.deleteMany({ room: { $in: ids } });
    await Swipe.deleteMany({ room: { $in: ids } });

    res.json({ message: `${ids.length} oda başarıyla silindi.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Sistem istatistiklerini getir
// @route   GET /api/admin/stats
// @access  Admin
// Optimizasyon: 7 ayrı countDocuments → 2 aggregate ile 2 DB round-trip'e indirildi
export const getStats = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Paralel: User istatistikleri + Room istatistikleri aynı anda
    const [userStats, roomStats] = await Promise.all([
      // Tek aggregate ile tüm user metriklerini hesapla
      User.aggregate([
        {
          $facet: {
            byRole: [{ $group: { _id: '$role', count: { $sum: 1 } } }],
            newThisWeek: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              { $count: 'count' },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ]),
      // Tek aggregate ile tüm room metriklerini hesapla
      Room.aggregate([
        {
          $facet: {
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            total: [{ $count: 'count' }],
          },
        },
      ]),
    ]);

    // User sonuçlarını parse et
    const uData = userStats[0];
    const roleMap = Object.fromEntries(
      uData.byRole.map(r => [r._id, r.count])
    );
    const totalUsers = uData.total[0]?.count || 0;
    const newUsersThisWeek = uData.newThisWeek[0]?.count || 0;

    // Room sonuçlarını parse et
    const rData = roomStats[0];
    const statusMap = Object.fromEntries(
      rData.byStatus.map(s => [s._id, s.count])
    );
    const totalRooms = rData.total[0]?.count || 0;

    res.json({
      totalUsers,
      totalRooms,
      guestUsers: roleMap['Guest'] || 0,
      hostUsers: roleMap['Host'] || 0,
      adminUsers: roleMap['Admin'] || 0,
      activeRooms: (statusMap['waiting'] || 0) + (statusMap['voting'] || 0),
      completedRooms: statusMap['finished'] || 0,
      newUsersThisWeek,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toplu etkinlik verisi aktarımı (JSON)
// @route   POST /api/admin/import-events
// @access  Admin
export const importEvents = async (req, res, next) => {
  try {
    const { events, clearOld } = req.body;

    if (!events || !Array.isArray(events)) {
      res.status(400);
      throw new Error('Lütfen geçerli bir JSON array sağlayın (events alanı altında)');
    }

    if (clearOld) {
      await Candidate.deleteMany({ isLiveEvent: true });
    }

    const now = new Date();
    const parsedEvents = [];

    for (const item of events) {
      if (!item.title || !item.ticketUrl) continue;

      const eventDate = item.eventDate ? new Date(item.eventDate) : new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const expireDate = new Date(eventDate);
      expireDate.setDate(expireDate.getDate() + 10);

      parsedEvents.push({
        externalId:  `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name:        item.title,
        description: item.description || '',
        imageUrl:    item.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85',
        category:    item.category || 'aktivite',
        location:    item.location || 'Bilinmiyor',
        mapsQuery:   item.location ? `${item.location} ${item.city || ''}` : '',
        ticketUrl:   item.ticketUrl,
        isLiveEvent: true,
        eventDate:   eventDate,
        expireAt:    expireDate,
        eventSource: item.provider || 'Bubilet',
        city:        item.city || 'Belirtilmemiş',
        isFeatured:  item.isFeatured || false,
        budget:      '₺₺',
      });
    }

    if (parsedEvents.length === 0) {
      res.status(400);
      throw new Error('Geçerli bir etkinlik bulunamadı (title ve ticketUrl zorunlu)');
    }

    await Candidate.insertMany(parsedEvents, { ordered: false });

    res.json({ message: `${parsedEvents.length} etkinlik başarıyla içe aktarıldı!` });
  } catch (error) {
    next(error);
  }
};


