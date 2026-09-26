import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Template } from '../models/template.model.js';

const initialTemplates = [
  {
    name: 'Victory Day Patriotic Poster',
    occasion: 'victory-day',
    description: 'National Patriotic celebration template for Victory Day with flag motifs and leader photo frames.',
    previewUrl: 'https://placehold.co/600x800/006a4e/ffffff?text=Victory+Day+Poster',
    layoutConfig: {
      canvas: { width: 1080, height: 1350, orientation: 'portrait' },
      photoPlacement: { top: 220, left: 140, width: 800, height: 520, borderRadius: '16px' },
      headlinePlacement: { top: 780, fontSize: '52px', color: '#006A4E', fontWeight: 'bold', align: 'center' },
      namePlacement: { top: 920, fontSize: '36px', color: '#F2A900', fontWeight: 'semibold', align: 'center' },
      footerPlacement: { top: 1220, height: 110, backgroundColor: '#006A4E', textColor: '#FFFFFF' },
    },
    isActive: true,
  },
  {
    name: 'Festive Eid Mubarak Poster',
    occasion: 'eid',
    description: 'Festive greeting template for Eid Mubarak celebrations featuring crescent moonlight aesthetic.',
    previewUrl: 'https://placehold.co/600x800/0b5345/ffffff?text=Eid+Greeting+Poster',
    layoutConfig: {
      canvas: { width: 1080, height: 1350, orientation: 'portrait' },
      photoPlacement: { top: 200, left: 190, width: 700, height: 500, borderRadius: '50%' },
      headlinePlacement: { top: 750, fontSize: '48px', color: '#D4AC0D', fontWeight: 'bold', align: 'center' },
      namePlacement: { top: 890, fontSize: '32px', color: '#1B4F72', fontWeight: 'semibold', align: 'center' },
      footerPlacement: { top: 1200, height: 120, backgroundColor: '#0B5345', textColor: '#F7DC6F' },
    },
    isActive: true,
  },
  {
    name: 'Solemn Condolence Message Poster',
    occasion: 'condolence',
    description: 'Respectful and solemn template for expressing heartfelt condolences and tribute.',
    previewUrl: 'https://placehold.co/600x800/1c2833/ffffff?text=Condolence+Poster',
    layoutConfig: {
      canvas: { width: 1080, height: 1350, orientation: 'portrait' },
      photoPlacement: { top: 240, left: 240, width: 600, height: 480, filter: 'grayscale(100%)' },
      headlinePlacement: { top: 760, fontSize: '44px', color: '#2C3E50', fontWeight: 'bold', align: 'center' },
      namePlacement: { top: 880, fontSize: '30px', color: '#566573', fontWeight: 'normal', align: 'center' },
      footerPlacement: { top: 1220, height: 100, backgroundColor: '#1C2833', textColor: '#E5E7E9' },
    },
    isActive: true,
  },
];

export const seedTemplates = async (): Promise<void> => {
  try {
    await connectDB();
    console.log('[Seed] Seeding poster templates...');

    for (const templateData of initialTemplates) {
      await Template.findOneAndUpdate(
        { occasion: templateData.occasion },
        templateData,
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`[Seed] Seeded template for occasion: "${templateData.occasion}"`);
    }

    console.log('[Seed] Poster templates seeded successfully!');
  } catch (error: any) {
    console.error('[Seed] Error seeding templates:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('[Seed] Database connection closed.');
  }
};

seedTemplates();
