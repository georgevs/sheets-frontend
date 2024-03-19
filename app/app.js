window.addEventListener('load', () => { (window.app = new App()).run() });

class App {
  constructor() {
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
    const spreadsheetId = '1UbJN1IUOu28ujbab_zkdYrPaoIS3uByk3twBACqTxh4';

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
      ]
    });
    this.ui.main.render({ visible: false });
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
