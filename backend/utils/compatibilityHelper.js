/**
 * compatibilityHelper.js
 * BiteMatch – İki kullanıcı arasındaki uyum yüzdesini hesaplar.
 *
 * Algoritma:
 *   1. İki kullanıcının da "like" verdiği swipe'ları çek (tek aggregate)
 *   2. Jaccard Similarity: |A ∩ B| / |A ∪ B| * 100
 *      - Hem A hem B'nin beğendiği opsiyonlar → kesişim
 *      - A veya B'nin beğendiği toplam benzersiz opsiyonlar → birleşim
 *   3. Sonucu 0-100 arasında yuvarlayarak döner
 */

import Swipe from '../models/Swipe.js';

/**
 * İki kullanıcı arasındaki uyum yüzdesini hesaplar.
 * @param {string|ObjectId} userAId
 * @param {string|ObjectId} userBId
 * @returns {Promise<number>} 0-100 arası uyum yüzdesi
 */
export const calculateCompatibility = async (userAId, userBId) => {
  // İki kullanıcının "like" swipe'larını tek sorguda çek
  const swipes = await Swipe.find(
    {
      user: { $in: [userAId, userBId] },
      decision: 'like',
    },
    'user optionId'   // sadece 2 alan — hızlı
  ).lean();

  // Kullanıcı bazlı Set'ler oluştur (beğenilen optionId'ler)
  const setA = new Set();
  const setB = new Set();

  for (const s of swipes) {
    const uid = s.user.toString();
    const oid = s.optionId.toString();
    if (uid === userAId.toString()) setA.add(oid);
    else setB.add(oid);
  }

  // Hiçbiri beğenmemişse uyum 0
  if (setA.size === 0 && setB.size === 0) return 0;

  // Kesişim: A'da ve B'de de olan opsiyonlar
  let intersection = 0;
  for (const id of setA) {
    if (setB.has(id)) intersection++;
  }

  // Birleşim: toplam benzersiz beğenilen opsiyon
  const union = new Set([...setA, ...setB]).size;

  if (union === 0) return 0;

  return Math.round((intersection / union) * 100);
};

/**
 * Bir kullanıcının arkadaşlarıyla uyum skorlarını toplu hesaplar.
 * @param {string|ObjectId} userId
 * @param {Array<string|ObjectId>} friendIds
 * @returns {Promise<Array<{friendId, score}>>}
 */
export const calculateFriendCompatibilities = async (userId, friendIds) => {
  if (!friendIds || friendIds.length === 0) return [];

  // Paralel hesaplama
  const results = await Promise.all(
    friendIds.map(async (fid) => ({
      friendId: fid.toString(),
      score: await calculateCompatibility(userId, fid),
    }))
  );

  return results.sort((a, b) => b.score - a.score);
};
