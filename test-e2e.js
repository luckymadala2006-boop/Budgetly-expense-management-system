// Comprehensive automated test suite for Budgetly full-stack app
const http = require('http');

const PORT = 5000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, headers: res.headers, data });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Budgetly Test Suite ---');
  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition, name) {
    testsTotal++;
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      testsPassed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      process.exitCode = 1;
    }
  }

  const timestamp = Date.now();
  const user1 = {
    name: 'Alice Sharma',
    email: `alice_${timestamp}@test.com`,
    password: 'password123'
  };

  const user2 = {
    name: 'Bob Verma',
    email: `bob_${timestamp}@test.com`,
    password: 'securePassword'
  };

  try {
    // 1. Static file check
    const staticRes = await request('/');
    assert(staticRes.status === 200, 'Frontend index.html served at /');

    // 2. Register User 1
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: user1
    });
    assert(regRes.status === 201 && regRes.data.token && regRes.data.email === user1.email, 'Register User 1');
    const token1 = regRes.data.token;

    // 3. Duplicate Registration check
    const dupRes = await request('/api/auth/register', {
      method: 'POST',
      body: user1
    });
    assert(dupRes.status === 400, 'Reject duplicate email registration');

    // 4. Login User 1
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: user1.email, password: user1.password }
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Login User 1 with valid credentials');

    // 5. Invalid password login
    const badLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: user1.email, password: 'wrongpassword' }
    });
    assert(badLoginRes.status === 400, 'Reject login with invalid password');

    // 6. Get profile /api/auth/me
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(meRes.status === 200 && meRes.data.email === user1.email, 'GET /api/auth/me returns profile');

    // 7. Register User 2 (for data isolation testing)
    const reg2Res = await request('/api/auth/register', {
      method: 'POST',
      body: user2
    });
    assert(reg2Res.status === 201 && reg2Res.data.token, 'Register User 2');
    const token2 = reg2Res.data.token;

    // 8. Add transactions for User 1
    const currentDate = new Date().toISOString().slice(0, 10);

    const salaryRes = await request('/api/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        type: 'income',
        name: 'Tech Corp Salary',
        amount: 85000,
        category: 'Salary',
        date: currentDate
      }
    });
    assert(salaryRes.status === 201 && salaryRes.data.amount === 85000, 'Add Income Transaction (Salary)');
    const salaryTxId = salaryRes.data._id;

    const groceriesRes = await request('/api/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        type: 'expense',
        name: 'Weekly Groceries & Veggies',
        amount: 4500,
        category: 'Food',
        date: currentDate
      }
    });
    assert(groceriesRes.status === 201 && groceriesRes.data.amount === 4500, 'Add Expense Transaction (Food)');
    const foodTxId = groceriesRes.data._id;

    const rentRes = await request('/api/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        type: 'expense',
        name: 'Apartment Rent',
        amount: 22000,
        category: 'Rent',
        date: currentDate
      }
    });
    assert(rentRes.status === 201 && rentRes.data.amount === 22000, 'Add Expense Transaction (Rent)');

    // 9. Dashboard Summary for User 1
    const summaryRes = await request('/api/dashboard/summary', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(
      summaryRes.status === 200 &&
      summaryRes.data.totalIncome === 85000 &&
      summaryRes.data.totalExpenses === 26500 &&
      summaryRes.data.totalBalance === 58500,
      'Dashboard Summary calculations (Balance = Income - Expense)'
    );

    // 10. Dashboard Recent Transactions
    const recentRes = await request('/api/dashboard/recent', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(recentRes.status === 200 && recentRes.data.length === 3, 'Dashboard Recent returns recent transactions');

    // 11. Dashboard Categories breakdown
    const catRes = await request('/api/dashboard/categories', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(
      catRes.status === 200 &&
      catRes.data.totalExpense === 26500 &&
      catRes.data.categories.length === 2,
      'Dashboard Categories breakdown returns aggregated expenses'
    );

    // 12. Set Budget for Food for User 1
    const budgetRes = await request('/api/budgets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        category: 'Food',
        monthlyLimit: 10000
      }
    });
    assert(budgetRes.status === 201 && budgetRes.data.monthlyLimit === 10000, 'Create Monthly Budget (Food: 10000)');
    const foodBudgetId = budgetRes.data._id;

    // 13. Update Budget (upsert via POST or PUT)
    const updateBudgetRes = await request(`/api/budgets/${foodBudgetId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` },
      body: { monthlyLimit: 12000 }
    });
    assert(updateBudgetRes.status === 200 && updateBudgetRes.data.monthlyLimit === 12000, 'Update Monthly Budget to 12000');

    // 14. Fetch Budgets with calculated spending
    const budgetsRes = await request('/api/budgets', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(
      budgetsRes.status === 200 &&
      budgetsRes.data.length === 1 &&
      budgetsRes.data[0].spent === 4500 &&
      budgetsRes.data[0].remaining === 7500 &&
      !budgetsRes.data[0].isOver,
      'Budgets dynamically calculate current month spending from transactions'
    );

    // 15. User Data Isolation check: User 2 must see 0 transactions and 0 budgets
    const user2Summary = await request('/api/dashboard/summary', {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(
      user2Summary.status === 200 &&
      user2Summary.data.totalBalance === 0 &&
      user2Summary.data.totalIncome === 0 &&
      user2Summary.data.totalExpenses === 0,
      'Data Isolation: User 2 dashboard is empty'
    );

    // 16. Security check: User 2 cannot delete User 1's transaction
    const unauthorizedDel = await request(`/api/transactions/${foodTxId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(unauthorizedDel.status === 403, 'Cross-user deletion forbidden (403)');

    // 17. Delete Transaction
    const delRes = await request(`/api/transactions/${foodTxId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(delRes.status === 200, 'Delete transaction succeeds for owner');

    // 18. Delete Budget
    const delBudgetRes = await request(`/api/budgets/${foodBudgetId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(delBudgetRes.status === 200, 'Delete budget succeeds for owner');

    console.log(`\nResults: ${testsPassed}/${testsTotal} tests passed.`);
    if (testsPassed === testsTotal) {
      console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

// Allow time for server to bind
setTimeout(runTests, 1000);
