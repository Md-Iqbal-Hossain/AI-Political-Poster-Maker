import mongoose from 'mongoose';
import { Poster, IPoster } from '../models/poster.model.js';

function testPosterModelInstantiation() {
  console.log('Testing Poster model instantiation...');

  const dummyData: IPoster = {
    userId: new mongoose.Types.ObjectId(),
    templateId: new mongoose.Types.ObjectId(),
    occasion: 'বিজয় দিবস',
    headline: 'সবাইকে মহান বিজয় দিবসের শুভেচ্ছা',
    name: 'মোঃ জহিরুল ইসলাম',
    designation: 'সাধারণ সম্পাদক',
    party: 'বাংলাদেশ ছাত্র ফ্রন্ট',
    location: 'ঢাকা',
    originalImageUrl: 'https://cloudinary.com/original.jpg',
    generatedImageUrl: 'https://cloudinary.com/generated.jpg',
    generatedImagePublicId: 'posters/poster_123',
    layout: {
      backgroundColor: '#006A4E',
      accentColor: '#F42A41',
      photoPlacement: 'center-circle',
      headlinePlacement: 'top-banner',
      decorativeStyle: 'patriotic-flag',
      designNotes: 'Victory Day celebration layout',
    },
  };

  const doc = new Poster(dummyData);
  const validationError = doc.validateSync();

  if (validationError) {
    throw new Error(`Poster Model Validation Failed: ${validationError.message}`);
  }

  console.log('✓ Poster Document instantiated successfully with valid schema fields:');
  console.log('  - Model Name:', Poster.modelName);
  console.log('  - userId:', doc.userId.toString());
  console.log('  - templateId:', doc.templateId.toString());
  console.log('  - headline:', doc.headline);
  console.log('  - layout:', doc.layout);

  console.log('\nAll Poster model verification checks passed!');
}

testPosterModelInstantiation();
