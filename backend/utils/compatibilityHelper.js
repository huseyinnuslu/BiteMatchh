/**
 * BiteMatch – arkadaşlar arası tercih uyumu.
 * Oda içi optionId geçicidir; farklı odalardaki aynı kartı karşılaştırmak için
 * kart adı ve kategori kullanılır.
 */

import Swipe from '../models/Swipe.js';

const MIN_PREFERENCES_FOR_SCORE = 3;

const normalizePreference = (value = '') => value
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9çğıöşü]+/g, ' ')
  .trim();

const emptyProfile = () => ({ items: new Set(), categories: new Map() });

export const buildCompatibilityResult = (profileA, profileB) => {
  const comparedPreferences = Math.min(profileA.items.size, profileB.items.size);
  if (comparedPreferences < MIN_PREFERENCES_FOR_SCORE) {
    return { score: null, state: 'building', comparedPreferences, sharedLikes: 0 };
  }

  let sharedLikes = 0;
  for (const item of profileA.items) {
    if (profileB.items.has(item)) sharedLikes += 1;
  }
  const allItems = new Set([...profileA.items, ...profileB.items]);
  const itemSimilarity = allItems.size ? sharedLikes / allItems.size : 0;

  const allCategories = new Set([...profileA.categories.keys(), ...profileB.categories.keys()]);
  let categoryMinimum = 0;
  let categoryMaximum = 0;
  for (const category of allCategories) {
    const a = profileA.categories.get(category) || 0;
    const b = profileB.categories.get(category) || 0;
    categoryMinimum += Math.min(a, b);
    categoryMaximum += Math.max(a, b);
  }
  const categorySimilarity = categoryMaximum ? categoryMinimum / categoryMaximum : 0;

  return {
    score: Math.round((itemSimilarity * 0.75 + categorySimilarity * 0.25) * 100),
    state: 'ready',
    comparedPreferences,
    sharedLikes,
  };
};

const getPreferenceProfiles = async (userIds) => {
  const rows = await Swipe.aggregate([
    { $match: { user: { $in: userIds }, decision: 'like' } },
    { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'roomInfo' } },
    { $unwind: '$roomInfo' },
    {
      $project: {
        user: 1,
        category: { $ifNull: ['$roomInfo.category', 'custom'] },
        option: {
          $arrayElemAt: [{
            $filter: {
              input: '$roomInfo.options',
              as: 'option',
              cond: { $eq: ['$$option._id', '$optionId'] },
            },
          }, 0],
        },
      },
    },
    { $match: { 'option.name': { $type: 'string' } } },
    { $project: { user: 1, category: 1, optionName: '$option.name' } },
  ]);

  const profiles = new Map(userIds.map((id) => [id.toString(), emptyProfile()]));
  for (const row of rows) {
    const profile = profiles.get(row.user.toString());
    const itemName = normalizePreference(row.optionName);
    const category = normalizePreference(row.category) || 'custom';
    if (!profile || !itemName) continue;
    profile.items.add(`${category}:${itemName}`);
    profile.categories.set(category, (profile.categories.get(category) || 0) + 1);
  }
  return profiles;
};

export const calculateCompatibility = async (userAId, userBId) => {
  const profiles = await getPreferenceProfiles([userAId, userBId]);
  return buildCompatibilityResult(
    profiles.get(userAId.toString()) || emptyProfile(),
    profiles.get(userBId.toString()) || emptyProfile(),
  );
};

export const calculateFriendCompatibilities = async (userId, friendIds) => {
  if (!friendIds?.length) return [];
  const profiles = await getPreferenceProfiles([userId, ...friendIds]);
  const myProfile = profiles.get(userId.toString()) || emptyProfile();
  return friendIds
    .map((friendId) => ({
      friendId: friendId.toString(),
      ...buildCompatibilityResult(myProfile, profiles.get(friendId.toString()) || emptyProfile()),
    }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
};
