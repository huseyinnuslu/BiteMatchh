import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompatibilityResult } from '../utils/compatibilityHelper.js';

const profile = (items, categories) => ({
  items: new Set(items),
  categories: new Map(categories),
});

test('uyum skoru aynı kartları ve kategori dağılımını kullanır', () => {
  const result = buildCompatibilityResult(
    profile(['mekan:doner', 'mekan:pizza', 'film:inception'], [['mekan', 2], ['film', 1]]),
    profile(['mekan:doner', 'mekan:pizza', 'film:interstellar'], [['mekan', 2], ['film', 1]]),
  );

  assert.equal(result.state, 'ready');
  assert.equal(result.sharedLikes, 2);
  assert.equal(result.score, 63);
});

test('az tercih verisinde sahte düşük yüzde gösterilmez', () => {
  const result = buildCompatibilityResult(
    profile(['mekan:doner'], [['mekan', 1]]),
    profile(['mekan:doner', 'film:inception'], [['mekan', 1], ['film', 1]]),
  );

  assert.equal(result.state, 'building');
  assert.equal(result.score, null);
});
