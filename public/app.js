// ==========================================
// Full-Stack Budget Tracker - Budgetly
// ==========================================

const categories = {
  expense: ['Food', 'Transport', 'Rent', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other'],
  income: ['Salary', 'Freelance', 'Gift', 'Investment', 'Other']
};

const icons = {
  Food: '🍲',
  Transport: '🚕',
  Rent: '🏠',
  Shopping: '🛍️',
  Bills: '💡',
  Health: '💊',
  Entertainment: '🎬',
  Salary: '💼',
  Freelance: '💻',
  Gift: '🎁',
  Investment: '📈',
  Other: '✨'
};

let currentUser = null;
let currentTransactions = [];
let currentBudgets = [];

// DOM helpers
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Format currency in Indian Rupees
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// Format date for display
function formatDate(date) {
  if (!date) return '';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Display helper for alerts
function showAlert(elementId, message, type = 'error') {
  const el = $(`#${elementId}`);
  if (!el) return;
  if (!message) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }
  el.textContent = message;
  el.className = `alert-box alert-${type}`;
  el.classList.remove('hidden');
}

// Centralized API fetch helper
async function api(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = localStorage.getItem('budgetlyToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 && token) {
        logout();
        throw new Error(data.message || 'Session expired. Please log in again.');
      }
      throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// Switch between Login and Signup panels
function setAuth(mode) {
  showAlert('loginAlert', null);
  showAlert('signupAlert', null);
  $('#loginPanel').classList.toggle('hidden', mode === 'signup');
  $('#signupPanel').classList.toggle('hidden', mode === 'login');
}

// Start application after successful login/token validation
function startApp() {
  $('#authPage').classList.add('hidden');
  $('#app').classList.remove('hidden');

  const firstName = currentUser && currentUser.name ? currentUser.name.split(' ')[0] : 'there';
  $('#greeting').textContent = `Hello, ${firstName}!`;

  render();
}

// Logout user
function logout() {
  localStorage.removeItem('budgetlyToken');
  currentUser = null;
  currentTransactions = [];
  currentBudgets = [];

  $('#app').classList.add('hidden');
  $('#authPage').classList.remove('hidden');
  $('#loginForm').reset();
  $('#signupForm').reset();
  showAlert('loginAlert', null);
  showAlert('signupAlert', null);
}

// HTML builder for a transaction row
function transactionHtml(t) {
  const isIncome = t.type === 'income';
  const id = t._id || t.id;
  return `
    <div class="transaction-row" data-row-id="${id}">
      <div class="category-icon">${icons[t.category] || '✨'}</div>
      <div>
        <strong>${t.name}</strong>
        <small>${t.category} · ${formatDate(t.date)}</small>
      </div>
      <span class="transaction-value ${isIncome ? 'income-value' : ''}">
        ${isIncome ? '+' : '-'}${money(t.amount)}
      </span>
      <button class="delete-btn" data-delete="${id}" title="Delete transaction">×</button>
    </div>
  `;
}

// Load and render Dashboard Data (Summary, Recent, Breakdown)
async function renderDashboard() {
  try {
    const [summary, recent, categoriesData] = await Promise.all([
      api('/api/dashboard/summary'),
      api('/api/dashboard/recent'),
      api('/api/dashboard/categories')
    ]);

    // Update Summary Cards
    const balance = summary.totalBalance || 0;
    $('#balance').textContent = money(balance);
    $('#income').textContent = money(summary.totalIncome || 0);
    $('#expense').textContent = money(summary.totalExpenses || 0);
    $('#balanceText').textContent = balance >= 0 ? 'Available to spend' : 'You are over budget';

    // Update Recent Transactions
    if (recent && recent.length) {
      $('#recentTransactions').innerHTML = recent.map(transactionHtml).join('');
    } else {
      $('#recentTransactions').innerHTML = '<p class="subtext">No transactions yet. Add your first one.</p>';
    }

    // Update Spending by Category Breakdown
    const totalExp = categoriesData.totalExpense || 0;
    const catList = categoriesData.categories || [];
    if (catList.length) {
      $('#categoryBreakdown').innerHTML = catList
        .slice(0, 5)
        .map(
          (c) => `
          <div class="breakdown-item">
            <span>${icons[c.category] || '✨'} ${c.category}</span>
            <strong>${money(c.total)}</strong>
            <div class="progress">
              <i style="width: ${totalExp > 0 ? (c.total / totalExp) * 100 : 0}%"></i>
            </div>
          </div>
        `
        )
        .join('');
    } else {
      $('#categoryBreakdown').innerHTML = '<p class="subtext">Expense categories will appear here.</p>';
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Load and render All Transactions list with filters
async function renderTransactions() {
  try {
    const type = $('#typeFilter').value;
    const category = $('#categoryFilter').value;

    const query = new URLSearchParams();
    if (type !== 'all') query.append('type', type);
    if (category !== 'all') query.append('category', category);

    const items = await api(`/api/transactions?${query.toString()}`);
    currentTransactions = items;

    if (items && items.length) {
      $('#allTransactions').innerHTML = items.map(transactionHtml).join('');
    } else {
      $('#allTransactions').innerHTML = '<p class="subtext">No matching transactions.</p>';
    }
  } catch (error) {
    console.error('Failed to load transactions:', error);
    $('#allTransactions').innerHTML = `<p class="subtext">Error loading transactions: ${error.message}</p>`;
  }
}

// Load and render Monthly Budgets with calculated spending & progress bars
async function renderBudgets() {
  try {
    const budgets = await api('/api/budgets');
    currentBudgets = budgets;

    if (budgets && budgets.length) {
      $('#budgetList').innerHTML = budgets
        .map((b) => {
          const limit = b.monthlyLimit;
          const spent = b.spent || 0;
          const percentage = Math.min(Math.round((spent / limit) * 100), 100);
          const isOver = spent > limit;

          return `
            <article class="budget-card">
              <div class="budget-header">
                <h3>${icons[b.category] || '✨'} ${b.category}</h3>
                <button class="delete-btn" data-delete-budget="${b._id}" title="Delete budget">×</button>
              </div>
              <p>Monthly spending limit</p>
              <div class="budget-numbers">
                <strong class="${isOver ? 'over' : ''}">${money(spent)} spent</strong>
                <span>of ${money(limit)}</span>
              </div>
              <div class="progress" style="margin-top: 11px">
                <i class="${isOver ? 'over-bar' : ''}" style="width: ${percentage}%; ${
            isOver ? 'background: var(--red)' : ''
          }"></i>
              </div>
            </article>
          `;
        })
        .join('');
    } else {
      $('#budgetList').innerHTML = '<p class="subtext">No budgets set yet. Set one to track your spending.</p>';
    }
  } catch (error) {
    console.error('Failed to load budgets:', error);
    $('#budgetList').innerHTML = `<p class="subtext">Error loading budgets: ${error.message}</p>`;
  }
}

// Master render: refreshes all sections from MongoDB
async function render() {
  await Promise.all([renderDashboard(), renderTransactions(), renderBudgets()]);
}

// Helper to populate category selects
function fillCategory(select, type) {
  select.innerHTML = categories[type].map((c) => `<option value="${c}">${c}</option>`).join('');
}

// Initialize application state and UI controls
function init() {
  // Set today's date in header and date picker
  $('#today').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  $('#transactionDate').value = new Date().toISOString().slice(0, 10);

  // Populate category dropdowns
  fillCategory($('#transactionCategory'), 'expense');
  fillCategory($('#budgetCategory'), 'expense');

  // Populate transaction filter dropdown
  const allCats = [...new Set([...categories.expense, ...categories.income])];
  $('#categoryFilter').innerHTML =
    '<option value="all">All categories</option>' +
    allCats.map((c) => `<option value="${c}">${c}</option>`).join('');

  // Setup radio toggle for Expense / Income in transaction modal
  $$('input[name="type"]').forEach((r) => {
    r.onchange = () => fillCategory($('#transactionCategory'), r.value);
  });

  // Auth mode toggle buttons
  $$('[data-auth]').forEach((btn) => {
    btn.onclick = () => setAuth(btn.dataset.auth);
  });

  // Navigation link click handler
  $$('.nav-link, [data-page]').forEach((b) => {
    b.addEventListener('click', () => {
      const page = b.dataset.page;
      if (!page) return;
      $$('.page').forEach((p) => p.classList.toggle('active-page', p.id === page));
      $$('.nav-link').forEach((n) => n.classList.toggle('active', n.dataset.page === page));
    });
  });

  // Modal handlers
  $$('[data-open-modal]').forEach((b) => {
    b.onclick = () => {
      showAlert('transactionAlert', null);
      $('#transactionDate').value = new Date().toISOString().slice(0, 10);
      $('#transactionModal').classList.remove('hidden');
    };
  });

  $('#addBudgetBtn').onclick = () => {
    showAlert('budgetAlert', null);
    $('#budgetModal').classList.remove('hidden');
  };

  $$('.close-modal').forEach((b) => {
    b.onclick = () => b.closest('.modal').classList.add('hidden');
  });

  $$('.modal').forEach((m) => {
    m.onclick = (e) => {
      if (e.target === m) m.classList.add('hidden');
    };
  });

  // Filter change handlers
  $('#typeFilter').onchange = renderTransactions;
  $('#categoryFilter').onchange = renderTransactions;

  // Logout button
  $('#logoutBtn').onclick = logout;

  // Registration Form Submission
  $('#signupForm').onsubmit = async (e) => {
    e.preventDefault();
    showAlert('signupAlert', null);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const name = $('#signupName').value.trim();
      const email = $('#signupEmail').value.trim();
      const password = $('#signupPassword').value;

      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });

      localStorage.setItem('budgetlyToken', data.token);
      currentUser = { _id: data._id, name: data.name, email: data.email };
      $('#signupForm').reset();
      startApp();
    } catch (err) {
      showAlert('signupAlert', err.message || 'Registration failed');
    } finally {
      submitBtn.disabled = false;
    }
  };

  // Login Form Submission
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    showAlert('loginAlert', null);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const email = $('#loginEmail').value.trim();
      const password = $('#loginPassword').value;

      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('budgetlyToken', data.token);
      currentUser = { _id: data._id, name: data.name, email: data.email };
      $('#loginForm').reset();
      startApp();
    } catch (err) {
      showAlert('loginAlert', err.message || 'Login failed');
    } finally {
      submitBtn.disabled = false;
    }
  };

  // Add Transaction Form Submission
  $('#transactionForm').onsubmit = async (e) => {
    e.preventDefault();
    showAlert('transactionAlert', null);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const type = $('input[name="type"]:checked').value;
      const name = $('#transactionName').value.trim();
      const amount = Number($('#transactionAmount').value);
      const category = $('#transactionCategory').value;
      const date = $('#transactionDate').value;

      await api('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ type, name, amount, category, date })
      });

      e.target.reset();
      $('#transactionDate').value = new Date().toISOString().slice(0, 10);
      fillCategory($('#transactionCategory'), 'expense');
      $('input[name="type"][value="expense"]').checked = true;
      $('#transactionModal').classList.add('hidden');

      // Refresh all views
      await render();
    } catch (err) {
      showAlert('transactionAlert', err.message || 'Could not save transaction');
    } finally {
      submitBtn.disabled = false;
    }
  };

  // Set Budget Form Submission
  $('#budgetForm').onsubmit = async (e) => {
    e.preventDefault();
    showAlert('budgetAlert', null);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const category = $('#budgetCategory').value;
      const monthlyLimit = Number($('#budgetAmount').value);

      await api('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({ category, monthlyLimit })
      });

      e.target.reset();
      fillCategory($('#budgetCategory'), 'expense');
      $('#budgetModal').classList.add('hidden');

      // Refresh views
      await render();
    } catch (err) {
      showAlert('budgetAlert', err.message || 'Could not save budget');
    } finally {
      submitBtn.disabled = false;
    }
  };

  // Global Delete Click Handler for Transactions & Budgets
  document.addEventListener('click', async (e) => {
    // Delete Transaction
    if (e.target.dataset.delete) {
      const id = e.target.dataset.delete;
      if (confirm('Are you sure you want to delete this transaction?')) {
        try {
          await api(`/api/transactions/${id}`, { method: 'DELETE' });
          await render();
        } catch (err) {
          alert('Failed to delete transaction: ' + err.message);
        }
      }
    }

    // Delete Budget
    if (e.target.dataset.deleteBudget) {
      const id = e.target.dataset.deleteBudget;
      if (confirm('Are you sure you want to delete this budget?')) {
        try {
          await api(`/api/budgets/${id}`, { method: 'DELETE' });
          await render();
        } catch (err) {
          alert('Failed to delete budget: ' + err.message);
        }
      }
    }
  });

  // Check existing session on page load
  checkAuth();
}

// Verify existing token on initial page load
async function checkAuth() {
  const token = localStorage.getItem('budgetlyToken');
  if (!token) return;

  try {
    const user = await api('/api/auth/me');
    currentUser = user;
    startApp();
  } catch (err) {
    console.warn('Existing session invalid or expired:', err.message);
    localStorage.removeItem('budgetlyToken');
  }
}

// Start everything when DOM is ready
document.addEventListener('DOMContentLoaded', init);
