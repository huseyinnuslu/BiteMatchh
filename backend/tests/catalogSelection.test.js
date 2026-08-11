import test from 'node:test';
import assert from 'node:assert/strict';
import { mockOptions, selectDiverseOptions } from '../data/mockOptions.js';

test('katalog kategorileri boş değildir ve temel kart alanlarını taşır', () => {
  ['mekan', 'film', 'aktivite'].forEach((category) => {
    const cards = mockOptions[category];
    assert.ok(Array.isArray(cards) && cards.length >= 10, `${category} yeterli karta sahip olmalı`);
    cards.forEach((card) => {
      assert.ok(card.name?.trim(), `${category} kartında isim zorunlu`);
      assert.ok(card.description?.trim(), `${card.name} açıklaması zorunlu`);
      assert.ok(card.imageUrl?.trim(), `${card.name} görsel URL'si zorunlu`);
    });
  });
});

test('çeşitli kart seçimi istenen sayıyı aşmaz ve kartı tekrar etmez', () => {
  const source = mockOptions.mekan;
  const selected = selectDiverseOptions(source, 12);

  assert.equal(selected.length, 12);
  assert.equal(new Set(selected).size, selected.length);
  selected.forEach((card) => assert.ok(source.includes(card)));
});

test('çeşitli kart seçimi havuzdan büyük isteklerde güvenli çalışır', () => {
  const source = mockOptions.aktivite.slice(0, 4);
  const selected = selectDiverseOptions(source, 20);

  assert.equal(selected.length, source.length);
  assert.equal(new Set(selected).size, source.length);
});
