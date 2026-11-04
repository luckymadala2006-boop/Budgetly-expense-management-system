const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: {
      values: ['income', 'expense'],
      message: '{VALUE} is not a valid transaction type (must be income or expense)'
    },
    required: [true, 'Please specify transaction type']
  },
  name: {
    type: String,
    required: [true, 'Please provide a transaction description'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
    min: [0.01, 'Amount must be greater than zero']
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    enum: {
      values: [
        'Food', 'Transport', 'Rent', 'Shopping', 'Bills', 'Health', 'Entertainment',
        'Salary', 'Freelance', 'Gift', 'Investment', 'Other'
      ],
      message: '{VALUE} is not a valid category'
    }
  },
  date: {
    type: String,
    required: [true, 'Please provide a transaction date']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for fast retrieval per user
transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
