# Budgetly – Full-Stack Personal Budget Tracker

Budgetly is a modern, responsive full-stack personal budget tracking web application built using **Node.js, Express.js, MongoDB (Mongoose), and Vanilla JavaScript**. It enables users to securely track their income and expenses, organize transactions by category, set monthly category spending limits with visual progress meters, and get real-time financial insights on an intuitive dashboard.

---

## 🌟 Key Features

1. **User Authentication & Authorization**:
   - Secure registration and login with name, email, and password.
   - Passwords hashed using `bcryptjs` (salt rounds: 10).
   - Stateless session management using JSON Web Tokens (JWT).
   - Strict data isolation: each user can only see, create, modify, and delete their own transactions and budgets.

2. **Interactive Financial Dashboard**:
   - **Total Balance**: Calculated dynamically as $\text{Total Balance} = \text{Total Income} - \text{Total Expenses}$.
   - **Total Income & Total Expenses** summary cards with contextual status indicators.
   - **Recent Transactions**: Lists the 5 most recent transactions with icons, descriptions, and dates.
   - **Spending by Category**: Breakdown showing top spending categories with proportional visual progress bars.

3. **Transaction Management (CRUD)**:
   - Add income and expense transactions with description, amount, category, type, and date.
   - Expense categories: `Food`, `Transport`, `Rent`, `Shopping`, `Bills`, `Health`, `Entertainment`, `Other`.
   - Income categories: `Salary`, `Freelance`, `Gift`, `Investment`, `Other`.
   - Category-specific emoji icons preserved throughout the UI.
   - Filter transactions dynamically by type (All, Income, Expense) and category.
   - Delete transactions with automatic dashboard and budget progress recalculation.

4. **Monthly Budget Management**:
   - Set monthly spending limits for any expense category.
   - Calculates real spending automatically based on all expense transactions recorded in the current month.
   - Real-time progress bar reflecting percentage of budget consumed.
   - Dynamic overspending detection (turns red when expenses exceed budget limit).
   - Update or delete existing budgets anytime.

---

## 🏗️ Project Architecture

```
budgetly/
├── public/                    # Frontend static files served by Express
│   ├── index.html             # Main Single Page Application structure
│   ├── style.css              # Custom styling, responsive layout, CSS variables
│   └── app.js                 # Frontend application logic & API integration
├── models/                    # Mongoose database schemas
│   ├── User.js                # User schema with bcrypt password hashing
│   ├── Transaction.js         # Transaction schema (income & expense)
│   └── Budget.js              # Monthly budget schema with category limits
├── routes/                    # Express REST API routes
│   ├── authRoutes.js          # Registration, login, profile (/api/auth)
│   ├── transactionRoutes.js   # Transactions CRUD (/api/transactions)
│   ├── dashboardRoutes.js     # Summary, recent, categories (/api/dashboard)
│   └── budgetRoutes.js        # Budget CRUD & calculations (/api/budgets)
├── middleware/                # Custom Express middlewares
│   └── authMiddleware.js      # JWT verification & user protection
├── config/                    # Configuration files
│   └── db.js                  # MongoDB Mongoose connection
├── .env                       # Environment variables (PORT, MONGO_URI, JWT_SECRET)
├── .env.example               # Example template for environment variables
├── .gitignore                 # Files excluded from git tracking
├── server.js                  # Express application entry point
├── test-e2e.js                # Automated end-to-end API test suite
└── package.json               # Project manifest and npm dependencies
```

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0 or higher)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) installed and running locally on port 27017

### 1. Clone or Open the Project
Open terminal in the project directory:
```bash
cd PROJECT
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create or verify the `.env` file in the project root:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/Budgetly
JWT_SECRET=budgetly_super_secret_jwt_key_2026
```

### 4. Start the Application
- **Production mode:**
  ```bash
  npm start
  ```
- **Development mode (with auto-restart on changes):**
  ```bash
  npm run dev
  ```

### 5. Access the Web App
Open your web browser and navigate to:
```
http://localhost:5000
```

---

## 🧪 Automated Testing

An automated test suite (`test-e2e.js`) is included to verify all API endpoints, database operations, calculations, and security isolation:

```bash
npm test
```

The test checks:
- Serving of frontend static files
- User registration and password hashing
- Prevention of duplicate email registration
- User login and invalid credential rejection
- JWT generation and profile verification (`/api/auth/me`)
- Data isolation between multiple users
- Income and expense transaction creation
- Real-time dashboard summary calculations
- Recent transaction retrieval and category breakdowns
- Monthly budget creation, updates, and current-month spending calculations
- Security verification preventing unauthorized cross-user data modifications
- Deletion of transactions and budgets

---

## 📡 REST API Reference (Postman / cURL)

All private endpoints require an `Authorization` header with the Bearer token:
`Authorization: Bearer <your_jwt_token>`

### 1. Authentication Endpoints

#### Register User
- **POST** `/api/auth/register`
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "_id": "67...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "token": "eyJhbGciOi..."
  }
  ```

#### Login User
- **POST** `/api/auth/login`
- **Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "_id": "67...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "token": "eyJhbGciOi..."
  }
  ```

#### Get Current Profile
- **GET** `/api/auth/me` *(Private)*

---

### 2. Transaction Endpoints

#### Add Transaction
- **POST** `/api/transactions` *(Private)*
- **Body**:
  ```json
  {
    "type": "expense",
    "name": "Grocery Shopping",
    "amount": 2500,
    "category": "Food",
    "date": "2026-11-04"
  }
  ```

#### Get Transactions
- **GET** `/api/transactions?type=expense&category=Food` *(Private)*
- Optional query parameters:
  - `type`: `all` | `income` | `expense`
  - `category`: `all` | `Food` | `Transport` | etc.
  - `month`: `1`-`12`
  - `year`: `2026`

#### Delete Transaction
- **DELETE** `/api/transactions/:id` *(Private)*

---

### 3. Dashboard Endpoints

#### Summary Stats
- **GET** `/api/dashboard/summary` *(Private)*
- **Response (200 OK)**:
  ```json
  {
    "totalBalance": 45000,
    "totalIncome": 60000,
    "totalExpenses": 15000,
    "transactionCount": 8
  }
  ```

#### Recent Transactions
- **GET** `/api/dashboard/recent` *(Private)*

#### Category Breakdown
- **GET** `/api/dashboard/categories` *(Private)*

---

### 4. Budget Endpoints

#### Set or Update Budget
- **POST** `/api/budgets` *(Private)*
- **Body**:
  ```json
  {
    "category": "Food",
    "monthlyLimit": 8000
  }
  ```

#### Get Current Month's Budgets
- **GET** `/api/budgets` *(Private)*
- Returns all category budgets for the current month enriched with real-time `spent`, `remaining`, `percentage`, and `isOver` flags.

#### Update Budget Limit
- **PUT** `/api/budgets/:id` *(Private)*
- **Body**: `{ "monthlyLimit": 9500 }`

#### Delete Budget
- **DELETE** `/api/budgets/:id` *(Private)*

---

## 🎓 College Project Demonstration Walkthrough

When presenting this project:

1. **Start the Server**:
   ```bash
   npm start
   ```
   Show the terminal confirming `MongoDB Connected: 127.0.0.1` and `Server running on http://localhost:5000`.

2. **Open the Web Application**:
   Navigate to `http://localhost:5000`. Show the clean split-screen authentication view.

3. **Demonstrate Registration & Validation**:
   - Try submitting with a password shorter than 4 characters to show field validation.
   - Register a new user (e.g., `Rahul Sharma`, `rahul@test.com`).
   - Notice immediate login and welcoming greeting `"Hello, Rahul!"`.

4. **Add Transactions**:
   - Add an **Income** transaction (e.g., "Monthly Salary", ₹60,000, category `Salary`).
   - Observe the Total Balance card instantly update to `₹60,000`.
   - Add **Expense** transactions (e.g., "Groceries", ₹4,500 in `Food`, "Electricity Bill", ₹2,200 in `Bills`).
   - Observe:
     - Total Balance automatically recalculated ($60,000 - 6,700 = ₹53,300$).
     - Spending by Category progress bars updating in real-time.
     - Recent transactions list updated.

5. **Demonstrate Filtering & CRUD**:
   - Click **Transactions** in sidebar.
   - Filter by `Expenses` and `Income`.
   - Filter by specific categories.
   - Delete a transaction and show immediate balance recalculation.

6. **Demonstrate Monthly Budgets**:
   - Click **Budgets** in sidebar.
   - Click **+ Set a budget** for `Food` with limit `₹5,000`.
   - Show the progress bar displaying the exact ₹4,500 spent out of ₹5,000.
   - Add another expense transaction of ₹1,000 in `Food`.
   - Return to Budgets and demonstrate that the bar turns **red** with an "Over budget" warning.

7. **Demonstrate Multi-User Data Isolation**:
   - Log out.
   - Register a second user (e.g., `Priya Patel`, `priya@test.com`).
   - Show that Priya's dashboard is completely clean (₹0 balance, no transactions, no budgets).
   - Log back into Rahul's account to confirm all his data remains securely persisted in MongoDB.
