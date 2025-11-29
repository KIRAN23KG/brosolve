// src/routes/categories.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');
const { permit } = require('../middleware/role');

// Helper: slugify
const slugify = (s) => {
  return s.toString().trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
};

// GET /api/categories - public listing of active categories
router.get('/', async (req, res) => {
  try {
    const q = req.query.q || '';
    const includeInactive = req.query.includeInactive === 'true';
    
    const filter = {};
    if (!includeInactive) {
      filter.isActive = true;
    }
    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }
    
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('GET /api/categories error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/categories/:id - get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    console.error('GET /api/categories/:id error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/categories - create category (superadmin only)
router.post('/', auth, permit('superadmin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Category name required' });
    }
    
    const slug = slugify(name);
    
    // Check for existing name or slug
    const exists = await Category.findOne({ 
      $or: [{ name: name.trim() }, { slug }] 
    });
    
    if (exists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
    
    const cat = new Category({
      name: name.trim(),
      slug,
      description: description || '',
      createdBy: req.user.id
    });
    
    await cat.save();
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    console.error('POST /api/categories error', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/categories/:id - update (superadmin only)
router.patch('/:id', auth, permit('superadmin'), async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // If name is being updated, check for duplicates
    if (name && name.trim() !== category.name) {
      const slug = slugify(name);
      const exists = await Category.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name: name.trim() }, { slug }]
      });
      
      if (exists) {
        return res.status(400).json({ success: false, message: 'Category name already exists' });
      }
      
      category.name = name.trim();
      category.slug = slug;
    }
    
    if (description !== undefined) {
      category.description = description || '';
    }
    
    if (isActive !== undefined) {
      category.isActive = isActive;
    }
    
    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    console.error('PATCH /api/categories/:id error', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/categories/:id - soft-delete (superadmin only)
router.delete('/:id', auth, permit('superadmin'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // Soft delete by setting isActive=false
    category.isActive = false;
    await category.save();
    
    res.json({ success: true, message: 'Category deleted', data: category });
  } catch (err) {
    console.error('DELETE /api/categories/:id error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/categories/:id/restore - restore soft-deleted category (superadmin only)
router.patch('/:id/restore', auth, permit('superadmin'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    category.isActive = true;
    await category.save();
    
    res.json({ success: true, message: 'Category restored', data: category });
  } catch (err) {
    console.error('PATCH /api/categories/:id/restore error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

