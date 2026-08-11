import mongoose from 'mongoose';

const roomSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    options: [{ 
      name: String, 
      imageUrl: String,
      fallbackImageUrl: String,
      rating: Number,
      budget: String,
      description: String,
      imdbScore: Number,
      platform: String,
      duration: String,
      location: String,
      mapsQuery: String,
      latitude: Number,
      longitude: Number,
      imageIsRepresentative: Boolean,
      imageAttribution: String,
      imageSourceUrl: String,
      venueType: String,
      screenFormat: String,
      website: String,
      showtimesUrl: String,
    }],
    category: {
      type: String,
      default: 'custom'
    },
    watchMode: {
      type: String,
      enum: ['streaming', 'cinema', null],
      default: null,
    },
    streamingPlatforms: [{ type: String }],
    // Herkes sadece kendi erişimini işaretler; istemciye diğer üyelerin
    // platform listesi değil yalnızca tamamlayan kişi sayısı gönderilir.
    platformSelections: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      platforms: [{ type: String }],
      submittedAt: { type: Date, default: Date.now },
    }],
    priceRange: [
      {
        type: String
      }
    ],
    status: {
      type: String,
      enum: ['waiting', 'voting', 'finished', 'expired'],
      default: 'waiting',
    },
    inviteExpiresAt: {
      type: Date,
      default: null,
    },
    matchResult: {
      name: String,
      imageUrl: String,
      fallbackImageUrl: String,
      rating: Number,
      budget: String,
      description: String,
      location: String,
      mapsQuery: String,
      imageIsRepresentative: Boolean,
      imageAttribution: String,
      imageSourceUrl: String,
      venueType: String,
      screenFormat: String,
      website: String,
      showtimesUrl: String,
      latitude: Number,
      longitude: Number,
    },
    compatibilityPercentage: {
      type: Number,
      default: 0
    },
    topOptions: [{
      name: String,
      imageUrl: String,
      fallbackImageUrl: String,
      rating: Number,
      budget: String,
      description: String,
      location: String,
      mapsQuery: String,
      imageIsRepresentative: Boolean,
      imageAttribution: String,
      imageSourceUrl: String,
      likeCount: Number
    }],
    timeLimit: {
      type: Number,
      default: 0 // 0 means unlimited
    },
    votingStartedAt: {
      type: Date
    },
    parentRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    restaurantRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    restaurantRecommendations: [{
      venueId: String,
      name: String,
      address: String,
      imageUrl: String,
      fallbackImageUrl: String,
      imageIsRepresentative: Boolean,
      imageAttribution: String,
      imageSourceUrl: String,
      mapsUrl: String,
      venueType: String,
      screenFormat: String,
      website: String,
      showtimesUrl: String,
      latitude: Number,
      longitude: Number,
      maxGroupDistanceKm: Number,
      verificationScore: Number,
    }],
    restaurantRecommendationVersion: {
      type: Number,
      default: 0,
    },
    restaurantQuickVotes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      likedVenueIds: [String],
      completedAt: Date,
    }],
    restaurantDecisionStatus: {
      type: String,
      enum: ['pending', 'matched', 'no_match'],
      default: 'pending',
    },
    restaurantDecisionResult: {
      venueId: String,
      name: String,
      imageUrl: String,
      fallbackImageUrl: String,
      imageIsRepresentative: Boolean,
      imageAttribution: String,
      imageSourceUrl: String,
      venueType: String,
      screenFormat: String,
      website: String,
      showtimesUrl: String,
      location: String,
      mapsQuery: String,
      latitude: Number,
      longitude: Number,
    },
    restaurantSort: {
      type: String,
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

// ─── İndeksler ──────────────────────────────────────────────────────────────
// getMyRooms: { host, createdAt } → host'a göre filtrele + createdAt'e göre sırala
roomSchema.index({ host: 1, createdAt: -1 });

// Admin / dashboard: status'e göre filtrele (waiting, voting, finished)
roomSchema.index({ status: 1 });

// participants dizisinde belirli bir user'ı ara (joinRoom kontrolü)
roomSchema.index({ participants: 1 });

// Aynı yemek eşleşmesi için ikinci restoran oylamasını tekrar kullanabilmek için.
roomSchema.index({ parentRoom: 1, restaurantSort: 1, status: 1 });

// Zombi Oda Temizliği: 30 dakika (1800 saniye) boyunca işlem görmeyen (updatedAt) waiting veya voting statüsündeki odaları otomatik sil
roomSchema.index(
  { updatedAt: 1 }, 
  { 
    expireAfterSeconds: 1800, 
    partialFilterExpression: { status: { $in: ['waiting', 'voting'] } } 
  }
);

// Geçmiş Eşleşmelerin Otomatik Temizliği: 30 günden eski (2592000 saniye) 'finished' statüsündeki odaları otomatik sil
// createdAt alanı baz alınarak 30 gün sonra otomatik silinecektir.
roomSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { status: 'finished' }
  }
);

const Room = mongoose.model('Room', roomSchema);

export default Room;
