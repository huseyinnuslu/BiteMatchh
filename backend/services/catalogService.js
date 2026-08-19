import CatalogOverride from '../models/CatalogOverride.js';
import { mockOptions } from '../data/mockOptions.js';
import { getStaticCatalogImageUrl } from './catalogAssetService.js';

const CATEGORIES = ['mekan', 'film', 'aktivite'];

export const getEffectiveCatalog = async () => {
  const overrides = await CatalogOverride.find({}).lean();
  const overrideMap = new Map(overrides.map((item) => [`${item.category}:${item.sourceName}`, item.changes || {}]));

  return Object.fromEntries(CATEGORIES.map((category) => [category, (mockOptions[category] || []).map((item) => {
    const sourceName = item.name;
    const changes = overrideMap.get(`${category}:${sourceName}`) || {};
    const staticImageUrl = changes.imageUrl ? null : getStaticCatalogImageUrl(category, sourceName, item.imageUrl);
    return {
      ...item,
      ...changes,
      imageUrl: staticImageUrl || changes.imageUrl || item.imageUrl,
      sourceName,
    };
  })]));
};

export const getCatalogAnalytics = async () => {
  const Room = (await import('../models/Room.js')).default;
  return Room.aggregate([
    { $match: { category: { $in: CATEGORIES } } },
    { $unwind: '$options' },
    { $lookup: {
      from: 'swipes',
      let: { roomId: '$_id', optionId: '$options._id' },
      pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$room', '$$roomId'] }, { $eq: ['$optionId', '$$optionId'] }] } } }],
      as: 'swipes',
    } },
    { $project: {
      category: 1,
      name: '$options.name',
      likes: { $size: { $filter: { input: '$swipes', as: 'swipe', cond: { $eq: ['$$swipe.decision', 'like'] } } } },
      swipes: { $size: '$swipes' },
    } },
    { $group: { _id: { category: '$category', name: '$name' }, likes: { $sum: '$likes' }, swipes: { $sum: '$swipes' } } },
  ]);
};
