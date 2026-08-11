/**
 * Message.js
 * BiteMatch – Mesajlaşma şeması
 * İki mod: 'room' (oda içi) ve 'direct' (arkadaşlar arası DM)
 */
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // 'room' → oda içi sohbet, 'direct' → kişiden kişiye DM
    type: {
      type:    String,
      enum:    ['room', 'direct'],
      default: 'room',
    },
    // Oda mesajı için (direct'te null)
    room: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Room',
      default: null,
    },
    // DM için alıcı (room mesajında null)
    recipient: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
      index:   true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    senderName: { type: String, required: true },
    text:       { type: String, maxlength: 500 },
    // DM event sharing
    sharedEvent: {
      name:        { type: String },
      imageUrl:    { type: String },
      location:    { type: String },
      ticketUrl:   { type: String },
      mapsQuery:   { type: String },
    },
    // “Sohbeti temizle” işlemi karşı tarafın kayıtlarını silmez. Mesaj,
    // temizleyen kullanıcının görünümünden gizlenir; yeni mesaj gelince sohbet
    // doğal olarak tekrar görünür.
    hiddenFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Oda mesajları 7 gün, DM'ler 90 gün saklanır
    expireAt: {
      type:    Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// TTL – expireAt geçince MongoDB otomatik siler
messageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
// Oda sorguları
messageSchema.index({ room: 1, createdAt: 1 });
// DM sorguları – (sender, recipient) çifti
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });
messageSchema.index({ hiddenFor: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
