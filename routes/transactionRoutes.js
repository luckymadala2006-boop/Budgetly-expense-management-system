const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// @route   POST /api/transactions
// @desc    Add a new transaction (income or expense)
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { type, name, amount, category, date } = req.body;

    if (!type || !name || amount === undefined || !category || !date) {
      return res.status(400).json({ message: 'Please provide all required fields: type, name, amount, category, date' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Transaction type must be income or expense' });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      name: name.trim(),
      amount: numericAmount,
      category,
      date
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: error.message || 'Server error while creating transaction' });
  }
});

// @route   GET /api/transactions
// @desc    Get all transactions for logged in user with optional filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { type, category, month, year } = req.query;
    const filter = { userId: req.user._id };

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (month && year) {
      const formattedMonth = String(month).padStart(2, '0');
      // Matches date string format 'YYYY-MM-DD'
      filter.date = new RegExp(`^${year}-${formattedMonth}`);
    } else if (year) {
      filter.date = new RegExp(`^${year}`);
    }

    const transactions = await Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error('Fetch transactions error:', error);
    res.status(500).json({ message: error.message || 'Server error while fetching transactions' });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction by ID
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify ownership
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this transaction' });
    }

    await transaction.deleteOne();

    res.json({ message: 'Transaction removed successfully', id: req.params.id });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: error.message || 'Server error while deleting transaction' });
  }
});

module.exports = router;
