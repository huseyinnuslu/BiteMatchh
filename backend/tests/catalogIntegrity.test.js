import test from 'node:test';
import assert from 'node:assert/strict';
import { mockOptions } from '../data/mockOptions.js';

const BASE_CATEGORIES = ['mekan', 'film', 'aktivite'];

test('katalogdaki her temel kategori yeterli, benzersiz ve eksiksiz kart tasir', () => {
  BASE_CATEGORIES.forEach((category) => {
    const cards = mockOptions[category];
    assert.ok(Array.isArray(cards), `${category} bir kart listesi olmali`);
    assert.ok(cards.length >= 20, `${category} beta icin en az 20 kart tasimali`);

    const normalizedNames = cards.map((card) => card.name.trim().toLocaleLowerCase('tr-TR'));
    assert.equal(new Set(normalizedNames).size, cards.length, `${category} ayni kart ismini tekrar etmemeli`);

    cards.forEach((card) => {
      assert.ok(card.name?.trim(), `${category} kartinda isim zorunlu`);
      assert.ok(card.description?.trim(), `${card.name} aciklamasi zorunlu`);
      assert.match(card.imageUrl || '', /^(https:\/\/|\/)/, `${card.name} gecerli bir gorsel kaynagi tasimali`);
    });
  });
});

test('yemek kartlari restoran aramasi icin niyet bilgisi tasir', () => {
  mockOptions.mekan.forEach((card) => {
    assert.ok(card.mapsQuery?.trim(), `${card.name} icin mekan arama ifadesi zorunlu`);
    assert.ok(card.discoveryGroup?.trim(), `${card.name} icin kesif grubu zorunlu`);
  });
});

test('ingilizce kategori takma adlari ayni temel kataloglari gosterir', () => {
  assert.equal(mockOptions.food, mockOptions.mekan);
  assert.equal(mockOptions.movie, mockOptions.film);
  assert.equal(mockOptions.activity, mockOptions.aktivite);
});
