// scripts/seedCategories.js
// Seed script to create default categories
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/models/Category');

const DEFAULT_CATEGORIES = [
  'Teaching Quality',
  'Infrastructure',
  'Hostel & Food',
  'Administration',
  'Technical Issue',
  'Other'
];

// Helper: slugify
const slugify = (s) => {
  return s.toString().trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
};

async function seedCategories() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🌱 SEEDING DEFAULT CATEGORIES');
    console.log('═══════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
    
    let created = 0;
    let skipped = 0;
    
    for (const name of DEFAULT_CATEGORIES) {
      const slug = slugify(name);
      
      // Check if category already exists
      const exists = await Category.findOne({ 
        $or: [{ name: name.trim() }, { slug }] 
      });
      
      if (exists) {
        console.log(`⏭️  Skipped: "${name}" (already exists)`);
        skipped++;
      } else {
        const category = new Category({
          name: name.trim(),
          slug,
          description: '',
          isActive: true
        });
        
        await category.save();
        console.log(`✅ Created: "${name}" (slug: ${slug})`);
        created++;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${DEFAULT_CATEGORIES.length}`);
    console.log('═══════════════════════════════════════════════════════');
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('Stack:', error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
seedCategories();

