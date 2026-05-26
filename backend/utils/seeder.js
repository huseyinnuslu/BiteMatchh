import Candidate from '../models/Candidate.js';
import { mockOptions } from '../data/mockOptions.js';

export const seedDatabase = async () => {
  try {
    const count = await Candidate.countDocuments();
    if (count > 0) {
      console.log('Database already has Candidate data. Skipping seeding.');
      return;
    }

    console.log('Seeding Candidates into database...');
    const candidatesToInsert = [];

    // Map mockOptions.mekan (food)
    mockOptions.mekan.forEach(item => {
      let priceLevel = 2;
      if (item.budget === '₺') priceLevel = 1;
      else if (item.budget === '₺₺') priceLevel = 2;
      else if (item.budget === '₺₺₺' || item.budget === '₺₺₺₺') priceLevel = 3;

      candidatesToInsert.push({
        ...item,
        category: 'mekan',
        priceLevel
      });
    });

    // Map mockOptions.film (movie)
    mockOptions.film.forEach(item => {
      candidatesToInsert.push({
        ...item,
        category: 'film',
        priceLevel: 2
      });
    });

    // Map mockOptions.aktivite (activity)
    mockOptions.aktivite.forEach(item => {
      let priceLevel = 2;
      if (item.budget === '₺' || item.budget === 'Bedava') priceLevel = 1;
      else if (item.budget === '₺₺') priceLevel = 2;
      else if (item.budget === '₺₺₺' || item.budget === '₺₺₺₺') priceLevel = 3;

      candidatesToInsert.push({
        ...item,
        category: 'aktivite',
        priceLevel
      });
    });

    await Candidate.insertMany(candidatesToInsert);
    console.log(`Successfully seeded ${candidatesToInsert.length} Candidates into database!`);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
