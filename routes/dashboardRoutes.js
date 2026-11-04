const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

// All dashboard routes are protected
router.use(protect);

// @route   GET /api/dashboard/summary
// @desc    Get total balance, income, and expenses for logged-in user
// @access  Private
router.get('/summary', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id });

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalBalance = totalIncome - totalExpenses;

    res.json({
      totalBalance,
      totalIncome,
      totalExpenses,
      transactionCount: transactions.length
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: error.message || 'Server error while fetching dashboard summary' });
  }
});

// @route   GET /api/dashboard/recent
// @desc    Get 5 most recent transactions for logged-in user
// @access  Private
router.get('/recent', async (req, res) => {
  try {
    const recent = await Transaction.find({ userId: req.user._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    res.json(recent);
  } catch (error) {
    console.error('Dashboard recent transactions error:', error);
    res.status(500).json({ message: error.message || 'Server error while fetching recent transactions' });
  }
});

// @route   GET /api/dashboard/categories
// @desc    Get spending breakdown by expense category
// @access  Private
router.get('/categories', async (req, res) => {
  try {
    const expenses = await Transaction.find({
      userId: req.user._id,
      type: 'expense'
    });

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    const categoryMap = {};
    expenses.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    const breakdown = Object.entries(categoryMap)
      .map(([category, total]) => ({
        category,
        total,
        percentage: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    res.json({
      totalExpense,
      categories: breakdown
    });
  } catch (error) {
    console.error('Dashboard category breakdown error:', error);
    res.status(500).json({ message: error.message || 'Server error while fetching category breakdown' });
  }
});

module.exports = router;
