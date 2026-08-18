import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, maxGroupDistanceKm, roundedDistanceKm } from '../utils/locationDistance.js';
import { venueMatchesFoursquareFoodProfile } from '../utils/venueVerification.js';

test('Haversine: same coordinate is zero and Istanbul landmarks are plausibly spaced', () => {
  const taksim = { latitude: 41.0369, longitude: 28.9850 };
  const kadikoy = { latitude: 40.9909, longitude: 29.0277 };

  assert.equal(haversineKm(taksim, taksim), 0);
  assert.ok(haversineKm(taksim, kadikoy) > 5);
  assert.ok(haversineKm(taksim, kadikoy) < 8);
  assert.equal(roundedDistanceKm(taksim, kadikoy), Number(haversineKm(taksim, kadikoy).toFixed(1)));
});

test('group max distance is a canonical scalar shared by every participant response', () => {
  const members = [
    { latitude: 41.0369, longitude: 28.9850 },
    { latitude: 40.9909, longitude: 29.0277 },
  ];
  const venue = { latitude: 41.0151, longitude: 28.9795 };

  const expected = Number(Math.max(...members.map((member) => haversineKm(member, venue))).toFixed(1));
  assert.equal(maxGroupDistanceKm(members, venue), expected);
  assert.equal(maxGroupDistanceKm([...members].reverse(), venue), expected);
});

test('food verification rejects an unrelated venue returned by provider relevance', () => {
  const baklavaProfile = {
    names: ['baklava'],
    queries: ['baklava', 'katmer', 'tatlıcı'],
    requiredTerms: ['baklava', 'katmer', 'tatli', 'tatlici', 'pastane', 'dessert', 'patisserie', 'confectionery', 'bakery', 'sweet shop'],
  };
  const unrelatedKofteci = { name: 'Cemil Usta Akçaabat Köfte', categories: [{ name: 'Turkish Restaurant' }] };
  const matchingBaklavaci = { name: 'Baklavacı Güllüoğlu', categories: [{ name: 'Dessert Shop' }] };

  assert.equal(venueMatchesFoursquareFoodProfile(unrelatedKofteci, baklavaProfile), false);
  assert.equal(venueMatchesFoursquareFoodProfile(matchingBaklavaci, baklavaProfile), true);
});
