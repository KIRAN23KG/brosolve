// src/routes/quickReplies.js
const express = require('express');
const QuickReply = require('../models/QuickReply');
const { auth } = require('../middleware/auth');
const { permit } = require('../middleware/role');

const router = express.Router();

// All routes require auth and admin/superadmin
router.use(auth);
router.use(permit('admin', 'superadmin'));

// GET /api/quick-replies - List global + current admin's personal templates
router.get('/', async (req, res) => {
  try {
    const global = await QuickReply.find({ scope: 'global' });
    const personal = await QuickReply.find({ 
      scope: 'personal', 
      createdBy: req.user.id 
    });
    
    res.json({ quickReplies: [...global, ...personal] });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching quick replies', error: err.message });
  }
});

// POST /api/quick-replies - Create
router.post('/', async (req, res) => {
  try {
    const { label, text, scope } = req.body;
    const quickReply = new QuickReply({
      label,
      text,
      createdBy: req.user.id,
      scope: scope || 'personal'
    });
    await quickReply.save();
    res.json({ message: 'Quick reply created', quickReply });
  } catch (err) {
    res.status(500).json({ message: 'Error creating quick reply', error: err.message });
  }
});

// PATCH /api/quick-replies/:id - Update
router.patch('/:id', async (req, res) => {
  try {
    const quickReply = await QuickReply.findById(req.params.id);
    if (!quickReply) return res.status(404).json({ message: 'Not found' });
    
    // Only creator can update personal, or any admin for global
    if (quickReply.scope === 'personal' && quickReply.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    Object.assign(quickReply, req.body);
    await quickReply.save();
    res.json({ message: 'Quick reply updated', quickReply });
  } catch (err) {
    res.status(500).json({ message: 'Error updating quick reply', error: err.message });
  }
});

// DELETE /api/quick-replies/:id - Delete
router.delete('/:id', async (req, res) => {
  try {
    const quickReply = await QuickReply.findById(req.params.id);
    if (!quickReply) return res.status(404).json({ message: 'Not found' });
    
    // Only creator can delete personal, or any admin for global
    if (quickReply.scope === 'personal' && quickReply.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await QuickReply.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quick reply deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting quick reply', error: err.message });
  }
});

module.exports = router;

