const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

// All budget routes are protected
router.use(protect);

// @route   POST /api/budgets
// @desc    Create or update (upsert) a monthly budget for a category
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { category, monthlyLimit, month, year } = req.body;

    if (!category || monthlyLimit === undefined) {
      return res.status(400).json({ message: 'Category and monthly limit are required' });
    }

    const limit = Number(monthlyLimit);
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ message: 'Monthly limit must be a positive number' });
    }

    const currentDate = new Date();
    const budgetMonth = month ? Number(month) : currentDate.getMonth() + 1;
    const budgetYear = year ? Number(year) : currentDate.getFullYear();

    // Check if a budget already exists for this category, month, and year
    let budget = await Budget.findOne({
      userId: req.user._id,
      category,
      month: budgetMonth,
      year: budgetYear
    });

    if (budget) {
      // Update existing budget
      budget.monthlyLimit = limit;
      await budget.save();
      return res.json(budget);
    }

    // Create new budget
    budget = await Budget.create({
      userId: req.user._id,
      category,
      monthlyLimit: limit,
      month: budgetMonth,
      year: budgetYear
    });

    res.status(201).json(budget);
  } catch (error) {
    console.error('Create/update budget error:', error);
    res.status(500).json({ message: error.message || 'Server error while setting budget' });
  }
});

// @route   GET /api/budgets
// @desc    Get all budgets for current (or specified) month with calculated spending
// @access  Private
router.get('/', async (req, res) => {
  try {
    const currentDate = new Date();
    const month = req.query.month ? Number(req.query.month) : currentDate.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : currentDate.getFullYear();

    const budgets = await Budget.find({
      userId: req.user._id,
      month,
      year
    });

    // Format month for regex query matching 'YYYY-MM'
    const formattedMonth = String(month).padStart(2, '0');
    const monthRegex = new RegExp(`^${year}-${formattedMonth}`);

    // Fetch this month's expense transactions for the user
    const monthExpenses = await Transaction.find({
      userId: req.user._id,
      type: 'expense',
      date: monthRegex
    });

    // Calculate spending per category
    const categorySpending = {};
    monthExpenses.forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    // Enrich budgets with actual spent data and progress stats
    const enrichedBudgets = budgets.map(b => {
      const spent = categorySpending[b.category] || 0;
      const percentage = Math.min(Math.round((spent / b.monthlyLimit) * 100), 100);
      const isOver = spent > b.monthlyLimit;
      const remaining = Math.max(b.monthlyLimit - spent, 0);

      return {
        _id: b._id,
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        month: b.month,
        year: b.year,
        spent,
        remaining,
        percentage,
        isOver
      };
    });

    res.json(enrichedBudgets);
  } catch (error) {
    console.error('Fetch budgets error:', error);
    res.status(500).json({ message: error.message || 'Server error while fetching budgets' });
  }
});

// @route   PUT /api/budgets/:id
// @desc    Update an existing budget
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { monthlyLimit, category } = req.body;
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (budget.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this budget' });
    }

    if (monthlyLimit !== undefined) {
      const limit = Number(monthlyLimit);
      if (isNaN(limit) || limit <= 0) {
        return res.status(400).json({ message: 'Monthly limit must be a positive number' });
      }
      budget.monthlyLimit = limit;
    }

    if (category) {
      budget.category = category;
    }

    await budget.save();
    res.json(budget);
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ message: error.message || 'Server error while updating budget' });
  }
});

// @route   DELETE /api/budgets/:id
// @desc    Delete a budget
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (budget.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this budget' });
    }

    await budget.deleteOne();
    res.json({ message: 'Budget removed successfully', id: req.params.id });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ message: error.message || 'Server error while deleting budget' });
  }
});

module.exports = router;
