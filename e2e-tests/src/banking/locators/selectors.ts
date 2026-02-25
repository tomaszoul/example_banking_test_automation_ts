/**
 * Central selector registry for the Banking Project demo app.
 * All locators derived from live DOM inspection and Playwright codegen.
 *
 * Strategy priority:
 *   1. #id selectors (most stable)
 *   2. [ng-click] / [ng-model] directives (semantic, AngularJS-specific)
 *   3. Role + text selectors (accessible, human-readable)
 */

/** Landing page — entry point with Customer / Manager login buttons. */
export const HomePage = {
  heading: 'strong.mainHeading',
  customerLoginBtn: 'button[ng-click="customer()"]',
  managerLoginBtn: 'button[ng-click="manager()"]',
} as const

/** Customer login form — user dropdown and submit button. */
export const CustomerLoginPage = {
  userSelect: '#userSelect',
  loginBtn: 'button[type="submit"]',
} as const

/** Main dashboard — account info, balance, and navigation to sub-pages. */
export const CustomerDashboard = {
  welcomeName: 'span.fontBig',
  accountNumber: 'div.center[ng-hide="noAccount"] strong:nth-of-type(1)',
  balance: 'div.center[ng-hide="noAccount"] strong:nth-of-type(2)',
  currency: 'div.center[ng-hide="noAccount"] strong:nth-of-type(3)',
  accountSelect: '#accountSelect',
  transactionsBtn: 'button[ng-click="transactions()"]',
  depositBtn: 'button[ng-click="deposit()"]',
  withdrawBtn: 'button[ng-click="withdrawl()"]',
  logoutBtn: 'button[ng-click="byebye()"]',
} as const

/** Deposit form — amount input, submit, and success feedback. */
export const DepositPage = {
  amountInput: 'input[ng-model="amount"]',
  submitBtn: 'form button[type="submit"]',
  successMessage: 'span[ng-show="message"]',
} as const

/** Withdrawal form — amount input, submit, and result message. */
export const WithdrawPage = {
  amountInput: 'input[ng-model="amount"]',
  submitBtn: 'form button[type="submit"]',
  message: 'span[ng-show="message"]',
} as const

/** Transaction history — filterable table with date range controls. */
export const TransactionsPage = {
  table: 'table.table-bordered',
  startDateInput: '#start',
  endDateInput: '#end',
  tableRows: 'tbody tr',
  resetBtn: 'button[ng-click="reset()"]',
  backBtn: 'button[ng-click="back()"]',
} as const

/** Bank manager portal — add customers, open accounts, search & delete. */
export const ManagerPage = {
  addCustomerTab: 'button[ng-click="addCust()"]',
  openAccountTab: 'button[ng-click="openAccount()"]',
  customersTab: 'button[ng-click="showCust()"]',

  firstNameInput: 'input[ng-model="fName"]',
  lastNameInput: 'input[ng-model="lName"]',
  postCodeInput: 'input[ng-model="postCd"]',
  addCustomerBtn: 'button[ng-click="addCustomer()"]',

  customerSelect: '#userSelect',
  currencySelect: '#currency',
  processBtn: 'button[ng-click="process()"]',

  searchInput: 'input[ng-model="searchCustomer"]',
  customersTable: 'table.table-bordered',
  deleteBtn: 'button[ng-click="deleteCust(cust)"]',
} as const
