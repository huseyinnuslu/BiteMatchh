/**
 * Candidate.js
 * BiteMatch – Kart havuzu şeması
 * Hem statik mockOptions kartlarını hem de canlı etkinlik kartlarını tutar.
 */

import mongoose from 'mongoose';

const candidateSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    priceLevel: {
      type: Number,
      enum: [1, 2, 3],
      default: 2,
    },
    rating:      Number,
    budget:      String,
    description: String,
    imdbScore:   Number,
    platform:    String,
    duration:    String,
    location:    String,

    // ── Canlı Etkinlik Alanları ───────────────────────────────────────────
    /** Kartın süreli/canlı bir etkinlik olup olmadığı */
    isLiveEvent: {
      type: Boolean,
      default: false,
    },
    /** Etkinliğin gerçekleşeceği tarih ve saat */
    eventDate: {
      type: Date,
      default: null,
    },
    /** Verinin geldiği kaynak: "Biletix" | "Passo" | "Manual" | vb. */
    eventSource: {
      type: String,
      default: null,
    },
    /**
     * MongoDB TTL index hedefi.
     * Bu tarih geçtiğinde MongoDB belgeyiimotomatik siler (canlı etkinlikler için).
     * Statik kartlarda null bırakılır — TTL index sparse olduğundan etkilenmezler.
     */
    expireAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── İndeksler ───────────────────────────────────────────────────────────────

// TTL index: expireAt değeri dolan belgeler MongoDB tarafından otomatik silinir.
// sparse: true → expireAt = null olan statik kartlar etkilenmez.
candidateSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Kart havuzu sorgularında kullanılan filtreler için
candidateSchema.index({ category: 1, isLiveEvent: 1 });
candidateSchema.index({ isLiveEvent: 1, eventDate: 1 });

const Candidate = mongoose.model('Candidate', candidateSchema);

export default Candidate;
