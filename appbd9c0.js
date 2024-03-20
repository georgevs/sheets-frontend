class SummaryTable {
  constructor(el) {
    this.el = el;
  }

  static createElement(classNames = []) {
    const el = document.createElement('table');
    el.classList.add('summary', ...classNames);
    return el;
  }

  render({ onClicked, summary, visible }) {
    const header = ['ACCT', 'YTD', 'PYT', 'LDT', 'LAM'];  // also determines columns order

    if (summary) {
      this.renderSummary({ header, summary });
    }
    if (onClicked) {
      this.updateHandlers({ header, onClicked });
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }

    return this;
  }

  renderSummary({ header, summary }) {
    [document.createElement('thead')].forEach(thead => {
      this.el.tHead?.remove();
      [document.createElement('tr')].forEach(tr => {
        header.map(col => [document.createTextNode(col), document.createElement('th')])
          .forEach(([text, th]) => {
            th.appendChild(text);
            tr.appendChild(th);
          });
        thead.appendChild(tr);
      });
      this.el.appendChild(thead);
    });

    [document.createElement('tbody')].forEach(tbody => {
      Array.from(this.el.tBodies).shift()?.remove();

      const categories = ['income', 'utilities', 'medical', 'sport', 'expense'];  // also determines sections order
      const sections = categories.map(category => [
        ...summary.categorySummary.get(category), 
        summary.categoryTotalSummary.get(category)
      ]);
      sections.forEach((rows) => {
        rows.map(row => [row, document.createElement('tr')])
          .forEach(([row, tr]) => {
            const account = row.account() ?? row.label();
            const rowValues = new Map([
              ['ACCT', account],
              ['LAM', Format.amount(row.lastAmount())],
              ['LDT', Format.shortDay(row.lastDate())],
              ['PYT', Format.amount(row.prevYearTotal())],
              ['YTD', Format.amount(row.yearToDateTotal())],
            ]);
            const colClassNames = new Map([
              ['LAM', ['amount']],
              ['PYT', ['amount']],
              ['YTD', ['amount']],
            ]);
            header.map(col => [colClassNames.get(col), document.createTextNode(rowValues.get(col)), document.createElement('td')])
              .forEach(([classNames, text, td]) => {
                if (classNames) { td.classList.add(...classNames) }
                td.appendChild(text);
                tr.appendChild(td);
              });
              
            tr.dataset.account = row.account();
            
            tr.classList.toggle('total', row.kind() === 'total' || row.kind() === 'all');
            tr.classList.toggle('all', row.kind() === 'all');  

            tbody.appendChild(tr);
          });
      });

      this.el.appendChild(tbody);
    });
  }
  
  updateHandlers({ header, onClicked }) {
    if (this.removeClickedHandler) {
      this.removeClickedHandler();
    }
    Array.from(this.el.tBodies).forEach(tbody => {
      function handleTBodyClick(event) {
        if (event.target instanceof HTMLTableCellElement) {
          const col = header[event.target.cellIndex];
          const dataset = event.target.parentElement.dataset; // DOMStringMap
          onClicked(Object.assign({}, dataset, { col }));
        }
      }
      tbody.addEventListener('click', handleTBodyClick);
      this.removeClickedHandler = () => {
        tbody.removeEventListener('click', handleTBodyClick);
      };
    });
  }
}
class Ui {
  constructor(el) {
    this.el = el;
    this.menu = new Menu(this.el.querySelector('nav.menu'));
    this.summary = new SummaryTable(SummaryTable.createElement());
    this.expenses = new ExpensesTable(ExpensesTable.createElement());
    this.message = new MessageLabel(this.el.querySelector('.label-message'));
    this.main = new Main(this.el.querySelector('main'));
  }
  
  render({ message }) {
    if (message !== undefined) {
      this.message.render({ text: message });
      this.main.render({ present: this.message });
    }
  }
}


class Main {
  constructor(el) {
    this.el = el;
  }

  render({ visible, present: component }) {
    if (component) {
      this.el.replaceChild(component.el, this.el.firstElementChild);
      component.render({ visible: true });
      visible = true;  // enforce visible
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }
    return this;
  }
}

class MessageLabel {
  constructor(el) {
    this.el = el;
  }
  
  render({ text, visible }) {
    if (text !== undefined) {
      this.el.textContent = text.toString();
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }
    return this;
  }
}
class DemoApp {
  constructor() {
    this.services = new DemoServices();
    this.ui = new Ui(document.body);
    this.datasets = {};
    this.expensesFilter = new ExpensesFilter();
  }

  async run() {
    this.fetchDatasets();
  }

  async fetchDatasets() {
    const expensesValues = this.services.datasets.fetchExpensesValues();
    const categoriesValues = this.services.datasets.fetchCategoriesValues();

    let expenses, categories, error;
    try {
      expenses = new ExpensesDataset({ values: await expensesValues });
    } catch (ex) {
      error = ex;
    }
    try {
      categories = new CategoriesDataset({ values: await categoriesValues });
    } catch (ex) {
      error = ex;
    }

    if (error) {
      // error { code: 401, status: 'UNAUTHENTICATED' } if invalid token (revoked or expired)
      // error { code: 403, status: 'PERMISSION_DENIED' } if no token
      this.showUnauthenticated();
      return;
    }

    const summary = new SummaryToDateDataset({ expenses, categories, yearToDate: new Date() });

    this.handleDatasetsFetched({ expenses, categories, summary });
  }

  handleDatasetsFetched(datasets) {
    this.datasets = datasets;

    const handleExpensesClicked = ({ account, month, col }) => {
      const filter = this.expensesFilter.toggle(
        col === 'ACCT' && { account },
        col === 'DT' && { month },
      );
      this.ui.expenses.render({ filter });
    };
    
    const handleSummaryClicked = ({ account, col }) => {
      if (col === 'ACCT') {
        this.showExpenses({ filter: { account } });
      }
    };

    this.ui.summary.render({ 
      summary: this.datasets.summary, 
      onClicked: handleSummaryClicked
    });
    this.ui.expenses.render({
      categories: this.datasets.categories,
      expenses: this.datasets.expenses,
      onClicked: handleExpensesClicked
    });

    this.ui.menu.render({
      items: [
        { label: 'Expenses', onClicked: this.showExpenses.bind(this)},
        { label: 'Leave demo', onClicked: this.leaveDemo.bind(this) },
      ]
    });
    this.ui.main.render({ present: this.ui.summary });
  }

  showUnauthenticated(error) {
    this.ui.menu.render({
      items: [
        { label: 'Leave demo', onClicked: this.leaveDemo.bind(this) },
      ]
    });
    this.ui.main.render({ visible: false });
  }

  async leaveDemo() {
    (window.app = new App(new Config())).run();
  }

  showExpenses({ filter = {} } = {}) {
    this.expensesFilter = new ExpensesFilter(filter);

    this.ui.expenses.render({ filter });
    this.ui.menu.render({
      items: [
        { id: 'summary', label: 'Summary', onClicked: this.showSummary.bind(this)},
        { label: 'Leave demo', onClicked: this.leaveDemo.bind(this) },
      ]
    });
    this.ui.main.render({ present: this.ui.expenses });
  }

  showSummary() {
    this.ui.menu.render({
      items: [
        { id: 'expenses', label: 'Expenses', onClicked: this.showExpenses.bind(this)},
        { label: 'Leave demo', onClicked: this.leaveDemo.bind(this) },
      ]
    });
    this.ui.main.render({ present: this.ui.summary });
  }
}

class DemoServices {
  constructor() {
    this.datasets = new DemoDatasets();
  }
}

class DemoDatasets {
  async fetchExpensesValues() {
    return fetch('demo/BAL.json')
      .then(response => response.json())
      .then(({ values }) => values);
  }
  
  async fetchCategoriesValues() {
    return fetch('demo/CATX.json')
      .then(response => response.json())
      .then(({ values }) => values);
  }
}
class ExpensesDataset {
  constructor({ values }) {
    const index = new Map(values[0].map((x,i) => [x,i]));
    this.rows = [];
    for (let i = 1; i < values.length; ++i) {
      const row = values[i];
      try {
        const date = new Date(row[index.get('DT')]);
        const amount = Number.parseFloat(row[index.get('AMNT')]);
        const account = row[index.get('ACCT')].trim();
        const isValidRow = !isNaN(date.getFullYear()) &&
                           !isNaN(amount) &&
                           account.length > 0;
        if (isValidRow) { this.rows.push(new ExpenseRow({ date, amount, account })) }
      } catch {
        // noop
      }
    }
  }
}

class ExpenseRow extends Array {
  constructor({ date, amount, account }) {
    super(date, amount, account);
  }
  date() { return this[0] }
  amount() { return this[1] }
  account() { return this[2] }
}


class CategoriesDataset {
  constructor({ values }) {
    const index = new Map(values[0].map((x,i) => [x,i]));
    const rows = [];
    for (let i = 1; i < values.length; ++i) {
      const row = values[i];
      try {
        const account = row[index.get('ACCT')].trim();
        const categories = new Set(
          row[index.get('CAT')]
            .split(',')
            .map(category => category.trim())
            .filter(Boolean)
        );
        const isValidRow = account.length > 0 && categories.size > 0;
        if (isValidRow) { rows.push(new CategoryRow({ account, categories })) }
      } catch {
        // noop
      }
    }
    this.accountCategories = new Map(rows);
    this.categoryAccounts = rows.reduce((categoryAccounts, [account, categories]) => {
      categories.forEach(category => {
        const accounts = categoryAccounts.get(category) ?? categoryAccounts.set(category, new Set).get(category);
        accounts.add(account);
      });
      return categoryAccounts;
    }, new Map);
  }
}

class CategoryRow extends Array {
  constructor({ account, categories }) {
    super(account, categories);
  }
  account() { return this[0] }
  categories() { return this[1] }
}

class SummaryToDateDataset {
  constructor({ expenses, categories, yearToDate }) {
    const prevYearDate = new Date(yearToDate.getFullYear()-1, 0);

    const selectInDateInterval = (row) => (prevYearDate <= row.date() && row.date() <= yearToDate);

    const orderByAccountAndReverseDate = (lhs, rhs) => {
      let r = lhs.account().localeCompare(rhs.account());
      if (r == 0) {
        r = rhs.date() - lhs.date();
      }
      return r;
    };

    const rowAccount = (row) => row.account();

    const totalAmount = (year, rows) => (
      rows.filter(row => row.date().getFullYear() == year)
        .reduce((acc, row) => acc + row.amount(), 0)
    );
    
    const summary = (rows) => ({ 
      yearToDateTotal: totalAmount(yearToDate.getFullYear(), rows),
      prevYearTotal: totalAmount(prevYearDate.getFullYear(), rows),
      lastDate: rows[0].date(),
      lastAmount: rows[0].amount()
    });

    const summaryRowsOf = ({ expenses }) => {
      let rows = expenses.rows;
      rows = rows.filter(selectInDateInterval);
      rows = rows.sort(orderByAccountAndReverseDate);
      rows = Array.from(rows.groupBy(rowAccount));
      return rows.map(([account, rows]) => new SummaryRow(Object.assign({ account }, summary(rows))));
    };

    const totalSummaryAmount = (summaryRows) => ({ 
      yearToDateTotal: summaryRows.reduce((acc, row) => acc + row.yearToDateTotal(), 0),
      prevYearTotal: summaryRows.reduce((acc, row) => acc + row.prevYearTotal(), 0),
    });

    const categorySummaryOf = ({ categories, summaryRows }) => {
      const expensesAccounts = categories.categoryAccounts.get('expense');
      const incomeAccounts = categories.categoryAccounts.get('income');
      const medicalAccounts = categories.categoryAccounts.get('medical');
      const sportAccounts = categories.categoryAccounts.get('sport');
      const utilitiesAccounts = categories.categoryAccounts.get('utilities');
  
      const expensesSummaryRows = summaryRows.filter(row => expensesAccounts.has(row.account()));
      const incomeSummaryRows = summaryRows.filter(row => incomeAccounts.has(row.account()));
      const medicalSummaryRows = summaryRows.filter(row => medicalAccounts.has(row.account()));
      const sportSummaryRows = summaryRows.filter(row => sportAccounts.has(row.account()));
      const utilitiesSummaryRows = summaryRows.filter(row => utilitiesAccounts.has(row.account()));

      const otherExpensesSummaryRows = expensesSummaryRows.filter(row =>
        !medicalAccounts.has(row.account()) &&
        !sportAccounts.has(row.account()) &&
        !utilitiesAccounts.has(row.account())
      );
      
      const expensesTotalSummaryRow = new SummaryRow(
        Object.assign({ label:'ALL EXPENSES', kind:'all' }, totalSummaryAmount(expensesSummaryRows))
      );
      const incomeTotalSummaryRow = new SummaryRow(
        Object.assign({ label: 'ALL INCOME', kind: 'all' }, totalSummaryAmount(incomeSummaryRows))
      );
      const medicalTotalSummaryRow = new SummaryRow(
        Object.assign({ label:'MEDICAL', kind:'total' }, totalSummaryAmount(medicalSummaryRows))
      );
      const sportTotalSummaryRow = new SummaryRow(
        Object.assign({ label:'SPORT', kind:'total' }, totalSummaryAmount(sportSummaryRows))
      );
      const utilitiesTotalSummaryRow = new SummaryRow(
        Object.assign({ label:'UTILITIES', kind:'total' }, totalSummaryAmount(utilitiesSummaryRows))
      );

      const categorySummary = new Map([
        ['expense', otherExpensesSummaryRows],
        ['income', incomeSummaryRows],
        ['medical', medicalSummaryRows],
        ['sport', sportSummaryRows],
        ['utilities', utilitiesSummaryRows],
      ]);

      const categoryTotalSummary = new Map([
        ['expense', expensesTotalSummaryRow],
        ['income', incomeTotalSummaryRow],
        ['medical', medicalTotalSummaryRow],
        ['sport', sportTotalSummaryRow],
        ['utilities', utilitiesTotalSummaryRow],
      ]);
  
      return { categorySummary, categoryTotalSummary };
    };

    const summaryRows = summaryRowsOf({ expenses });
    const { categorySummary, categoryTotalSummary } = categorySummaryOf({ categories, summaryRows });

    this.rows = summaryRows;
    this.categorySummary = categorySummary;
    this.categoryTotalSummary = categoryTotalSummary;
  }
}

class SummaryRow extends Array {
  constructor({ label, account, yearToDateTotal, prevYearTotal, lastDate, lastAmount, kind }) {
    super(label, account, yearToDateTotal, prevYearTotal, lastDate, lastAmount, kind);
  }
  label() { return this[0] }
  account() { return this[1] }
  yearToDateTotal() { return this[2] }
  prevYearTotal() { return this[3] }
  lastDate() { return this[4] }
  lastAmount() { return this[5] }
  kind() { return this[6] }
}

Array.prototype.shuffle = function () {  // Knuth shuffle
  for (let i = 0; i < this.length; ++i) {
      const j = (Math.random() * (i+1)) | 0;
      const t = this[i]; this[i] = this[j]; this[j] = t;
  }
  return this;
}

Array.prototype.groupBy = function (fn) {
  return this.reduce((acc, x) => {
    const k = fn(x);
    (acc.get(k) ?? acc.set(k, []).get(k)).push(x);
    return acc;
  }, new Map);
}

class Format {
  static day(dt) { return dt === undefined ? '' : `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` }
  static weekDay(dt) { return dt === undefined ? '' : `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}'${dt.getFullYear().toString().slice(-2)} ${Format.weekday[dt.getDay()]}` }
  static shortDay(dt) { return dt === undefined ? '' : `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}'${dt.getFullYear().toString().slice(-2)}` }
  static month(dt) { return dt === undefined ? '' : `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` }
  static amount(amnt) { return amnt === undefined ? '' : amnt.toFixed(0) }
  static weekday = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
}

class ExpensesFilter extends Object {
  constructor(...xss) {
    super();
    this.toggle(...xss);
  }

  toggle(...xss) {
    for (let xs of xss) {
      if (xs) {
        for (let k in xs) {
          if (this[k] === undefined) { this[k] = xs[k] }
          else { delete this[k] }
        }
      }
    }
    return this;
  }
}
class Menu {
  static createElement(classNames = []) {
    const el = document.createElement('nav');
    el.classList.add('menu', ...classNames);
    return el;
  }

  constructor(el) {
    this.el = el;
    this.items = new Map();
  }

  render({ visible, items }) {
    if (items) {
      [document.createElement('ol')].forEach(ol => {
        this.items.clear();
        this.el.querySelector('ol')?.remove();
        items.map(item => [item.id, new MenuItem(MenuItem.createElement(item)).render(item)])
          .forEach(([id, item]) => {
            if (id) { this.items.set(id, item) }
            ol.appendChild(item.el);
          });
        this.el.appendChild(ol);
      });
      visible = true;  // enforce visible
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }
    return this;
  }
}

class MenuItem {
  static createElement({ classNames = [] }) {
    const el = document.createElement('li');
    el.classList.add('item', ...classNames);
    return el;
  }

  constructor(el) {
    this.el = el;
  }

  render({ id, label, onClicked, visible }) {
    if (label) {
      [document.createElement('a')].forEach(link => {
        link.textContent = label.toString();
        this.el.appendChild(link);
      });
    }
    if (onClicked) {
      if (this.removeClickedHandler) {
        this.removeClickedHandler();
      }
      function handleClicked() {
        onClicked({ id });
      }
      this.el.addEventListener('click', handleClicked);
      this.removeClickedHandler = () => {
        tbody.removeEventListener('click', handleClicked);
      };
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }
    return this;
  }
}
window.addEventListener('load', () => { (window.app = new App(new Config())).run() });


class Config {
  constructor() {
    this.spreadsheetId = '1UbJN1IUOu28ujbab_zkdYrPaoIS3uByk3twBACqTxh4';
  }
}

class App {
  constructor(config) {
    this.config = config;
    this.services = new Services();
    this.ui = new Ui(document.body);
    this.datasets = {};
    this.expensesFilter = new ExpensesFilter();
  }

  async run() {
    const token = this.services.storage.token();
    await this.services.init({ token });

    this.fetchDatasets();
  }

  async fetchDatasets() {
    const spreadsheetId = this.config.spreadsheetId;

    const expensesValues = this.services.spreadsheets.getValues({ spreadsheetId, range: 'BAL' });
    const categoriesValues = this.services.spreadsheets.getValues({ spreadsheetId, range: 'CATX' });

    let expenses, categories, error;
    try {
      expenses = new ExpensesDataset({ values: await expensesValues });
    } catch (ex) {
      error = ex;
    }
    try {
      categories = new CategoriesDataset({ values: await categoriesValues });
    } catch (ex) {
      error = ex;
    }

    if (error) {
      // error { code: 401, status: 'UNAUTHENTICATED' } if invalid token (revoked or expired)
      // error { code: 403, status: 'PERMISSION_DENIED' } if no token
      this.showUnauthenticated();
      return;
    }

    const summary = new SummaryToDateDataset({ expenses, categories, yearToDate: new Date() });

    this.handleDatasetsFetched({ expenses, categories, summary });
  }

  handleDatasetsFetched(datasets) {
    this.datasets = datasets;

    const handleExpensesClicked = ({ account, month, col }) => {
      const filter = this.expensesFilter.toggle(
        col === 'ACCT' && { account },
        col === 'DT' && { month },
      );
      this.ui.expenses.render({ filter });
    };
    
    const handleSummaryClicked = ({ account, col }) => {
      if (col === 'ACCT') {
        this.showExpenses({ filter: { account } });
      }
    };

    this.ui.summary.render({ 
      summary: this.datasets.summary, 
      onClicked: handleSummaryClicked
    });
    this.ui.expenses.render({
      categories: this.datasets.categories,
      expenses: this.datasets.expenses,
      onClicked: handleExpensesClicked
    });

    this.ui.menu.render({
      items: [
        { id: 'expenses', label: 'Expenses', onClicked: this.showExpenses.bind(this)},
        { id: 'logout', label: 'Logout', onClicked: this.signOut.bind(this) },
      ]
    });
    this.ui.main.render({ present: this.ui.summary });
  }

  showUnauthenticated(error) {
    this.ui.menu.render({
      items: [
        { id: 'login', label: 'Login', onClicked: this.signIn.bind(this) },
        { id: 'demo', label: 'Demo', onClicked: this.enterDemo.bind(this) },
      ]
    });
    this.ui.main.render({ visible: false });
  }

  enterDemo() {
    (window.app = new DemoApp()).run();
  }

  async signIn() {
    this.ui.menu.render({ visible: false });
    this.ui.render({ message: 'Signing in...' });

    const token = await this.services.authenticator.signIn();
    this.services.storage.setToken(token);

    this.handleAuthenticated();
  }

  async handleAuthenticated() {
    this.ui.render({ message: 'Loading...' });
    this.fetchDatasets();
  }

  showExpenses({ filter = {} } = {}) {
    this.expensesFilter = new ExpensesFilter(filter);

    this.ui.expenses.render({ filter });
    this.ui.menu.render({
      items: [
        { id: 'summary', label: 'Summary', onClicked: this.showSummary.bind(this)},
        { id: 'logout', label: 'Logout', onClicked: this.signOut.bind(this) },
      ]
    });
    this.ui.main.render({ present: this.ui.expenses });
  }

  showSummary() {
    this.ui.menu.render({
      items: [
        { id: 'expenses', label: 'Expenses', onClicked: this.showExpenses.bind(this)},
        { id: 'logout', label: 'Logout', onClicked: this.signOut.bind(this) },
      ]
    });
    this.ui.main.render({ present: this.ui.summary });
  }

  async signOut() {
    this.ui.menu.render({ visible: false });
    this.ui.render({ message: 'Signing out...' });

    await this.services.authenticator.signOut();
    this.services.storage.clearToken();

    this.showUnauthenticated();
  }
}
class ExpensesTable {
  constructor(el) {
    this.el = el;
  }

  static createElement(classNames = []) {
    const el = document.createElement('table');
    el.classList.add('expenses', ...classNames);
    return el;
  }

  render({ categories, expenses, filter, onClicked, visible }) {
    const header = ['DT', 'AMNT', 'ACCT'];  // also determines columns order

    if (categories && expenses) {
      this.renderExpenses({ header, categories, expenses });
    }
    if (filter) {
      this.applyFilter({ header, filter });
    }
    if (onClicked) {
      this.updateHandlers({ header, onClicked });
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }

    return this;
  }

  renderExpenses({ header, categories, expenses }) {
    [document.createElement('thead')].forEach(thead => {
      this.el.tHead?.remove();
      [document.createElement('tr')].forEach(tr => {
        header.map(col => [document.createTextNode(col), document.createElement('th')])
          .forEach(([text, th]) => {
            th.appendChild(text);
            tr.appendChild(th);
          });
        thead.appendChild(tr);
      });
      this.el.appendChild(thead);
    });

    [document.createElement('tbody')].forEach(tbody => {
      Array.from(this.el.tBodies).shift()?.remove();
      expenses.rows.map(row => [row, document.createElement('tr')])
        .forEach(([row, tr]) => {
          const account = row.account();
          const rowValues = new Map([
            ['ACCT', account],
            ['AMNT', Format.amount(row.amount())], 
            ['DT', Format.weekDay(row.date())], 
          ]);
          const colClassNames = new Map([
            ['AMNT', ['amount']],
          ]);
          header.map(col => [colClassNames.get(col), document.createTextNode(rowValues.get(col)), document.createElement('td')])
            .forEach(([classNames, text, td]) => {
              if (classNames) { td.classList.add(...classNames) }
              td.appendChild(text);
              tr.appendChild(td);
            });

          tr.dataset.account = account;
          tr.dataset.day = Format.day(row.date());
          tr.dataset.month = Format.month(row.date());

          ['expense', 'utilities', 'income'].forEach(category => {
            tr.classList.toggle(category, categories.categoryAccounts.get(category).has(account));
          });

          tbody.appendChild(tr);
        });

      this.el.appendChild(tbody);
    });
  }

  applyFilter({ header, filter }) {
    Array.from(this.el.tBodies).forEach(tbody => {
      const highlightSameDayRows = ExpensesTable.highlightSameDayRows.bind(null, {});
      const mergeSameDayCells = ExpensesTable.mergeSameDayCells.bind(null, { dayCellIndex: header.indexOf('DT') });

      const attributes = !!filter && [
        filter.account && `[data-account='${filter.account}']`,
        filter.month && `[data-month='${filter.month}']`,
      ].filter(Boolean).join('');

      if (attributes) {
        tbody.querySelectorAll(`tr:not(:where(tr${attributes}))`).forEach(tr => { 
          tr.classList.toggle('d-none', true);
        });
        tbody.querySelectorAll(`tr${attributes}`).forEach(tr => { 
          tr.classList.toggle('d-none', false);
          highlightSameDayRows(tr);
          mergeSameDayCells(tr);
        });
      } else {
        tbody.querySelectorAll('tr').forEach(tr => { 
          tr.classList.toggle('d-none', false);
          highlightSameDayRows(tr);
          mergeSameDayCells(tr);
        });
      }
    });
  }

  updateHandlers({ header, onClicked }) {
    if (this.removeClickedHandler) {
      this.removeClickedHandler();
    }
    Array.from(this.el.tBodies).forEach(tbody => {
      function handleTBodyClick(event) {
        if (event.target instanceof HTMLTableCellElement) {
          const col = header[event.target.cellIndex];
          const dataset = event.target.parentElement.dataset; // DOMStringMap
          onClicked(Object.assign({}, dataset, { col }));
        }
      }
      tbody.addEventListener('click', handleTBodyClick);
      this.removeClickedHandler = () => {
        tbody.removeEventListener('click', handleTBodyClick);
      };
    });
  }

  static highlightSameDayRows(state, tr) {
    const day = tr.dataset.day;
    if (state.lastDay !== day) {
      state.lastDay = day;
      state.highlight = !state.highlight;
    }
    tr.classList.toggle('highlighted', !state.highlight);
  }

  static mergeSameDayCells(state, tr) {
    const day = tr.dataset.day;
    const dayCell = tr.cells[state.dayCellIndex];
    if (state.lastDay !== day) {
      state.lastDay = day;
      state.lastDayCell = dayCell;
    }
    const isLastDateCell = (dayCell === state.lastDayCell);
    dayCell.classList.toggle('d-none', !isLastDateCell);
    dayCell.rowSpan = 1;
    state.lastDayCell.rowSpan += (isLastDateCell ? 0 : 1);
  }
}
class Services {
  constructor(config) {
    this.storage = new Storage(window.localStorage);
  }

  async init({ token } = {}) {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ];
    const discoveryDocs = [
      'https://sheets.googleapis.com/$discovery/rest?version=v4',
    ]
    const tokenClient = window.google.accounts.oauth2.initTokenClient({  // implicit grant flow
      client_id: '588879659786-96ialt5l1bn240naa55eh7gberlo66ds.apps.googleusercontent.com',
      scope: scopes.join(' '),
      prompt: '',  // prompt only the first time
      callback: null
    });

    await new Promise((callback, onerror) => {
      window.gapi.load('client', { callback, onerror });
    });
    await window.gapi.client.init({ discoveryDocs }); // preload apis 

    if (token?.access_token) {
      window.gapi.client.setToken(token);  // pre signin
    }

    this.authenticator = new Authenticator(tokenClient);
    this.spreadsheets = new Spreadsheets(window.gapi.client.sheets);
  }
}


class Authenticator {
  constructor(tokenClient) {
    this.tokenClient = tokenClient;
  }

  isSignedIn() {
    return !!window.gapi.client.getToken();
  }
  
  signIn() {
    return new Promise((resolve, reject) => {
      this.tokenClient.callback = (token) => {
        if (token?.error) { reject(token?.error) }
        else { resolve(token) }
      };
      this.tokenClient.requestAccessToken();
    });
  }

  signOut() {
    return new Promise((resolve, reject) => {
      const credentials = window.gapi.client.getToken();
      if (!credentials) {
        resolve(true);
        return  
      }
      window.gapi.client.setToken(null);
      window.google.accounts.oauth2.revoke(credentials.access_token, ({ error, successful }) => {
        if (error) { reject(error) }
        else { resolve(successful) }
      });
    });
  }
}


class Spreadsheets {
  constructor(sheets) {
    this.sheets = sheets;
  }

  getValues({ spreadsheetId, range }) {
    return this.sheets.spreadsheets.values.get({ spreadsheetId, range })
      .then(({ result: { values }}) => values)
      .catch(({ result: { error }}) => { throw error });
  }
}


class Storage {
  constructor(localStorage) {
    this.localStorage = localStorage;
  }

  token() { return JSON.parse(window.localStorage.getItem('token')) }
  setToken(token) { this.localStorage.setItem('token', JSON.stringify(token)) }
  clearToken() { this.localStorage.removeItem('token') }
}
