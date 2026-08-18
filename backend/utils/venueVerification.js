const GENERIC_VENUE_WORDS = new Set(['restaurant', 'restoran', 'restorani', 'mutfagi', 'sef', 'chef', 'food']);

export const normalizeFoodName = (value = '') => String(value)
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i');

export const getFoursquareCategoryNames = (place) => {
  const categories = place.categories || place.fsq_categories || [];
  return categories
    .map((category) => typeof category === 'string'
      ? category
      : category.name || category.fsq_category_name || category.label || category.fsq_category_label)
    .filter(Boolean);
};

// Provider relevance is useful but not proof that a place serves the selected
// food. A candidate needs an explicit trace in its name or source category.
export const venueMatchesFoursquareFoodProfile = (place, profile = {}) => {
  const requiredTerms = profile.requiredTerms || [
    ...(profile.names || []),
    ...(profile.queries || []),
  ].flatMap((term) => normalizeFoodName(term).split(/[^a-z0-9]+/))
    .filter((term) => term.length >= 4 && !GENERIC_VENUE_WORDS.has(term));
  if (!requiredTerms.length) return true;

  const searchableText = normalizeFoodName([
    place.name,
    ...getFoursquareCategoryNames(place),
  ].filter(Boolean).join(' '));
  return requiredTerms.some((term) => searchableText.includes(normalizeFoodName(term)));
};
