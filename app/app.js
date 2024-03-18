window.addEventListener('load', () => { (window.app = new App()).run() });

class App {
  constructor() {
    this.services = new Services();
    this.ui = new Ui(document.body);
    this.datasets = {};
  }

  async run() {
    await this.init();

    let datasets;
    try {
      datasets = await this.fetchDatasets({ retryAuthenticate: false });
    } catch (error) {
      this.handleUnauthenticated(error);
      return;
    }
    this.handleDatasetsFetched(datasets);
  }

  handleUnauthenticated(error) {
    this.ui.menu.render({
      visible: true,
      items: [
        { id: 'login', label: 'Login', onClicked: this.handleSignIn.bind(this) },
      ]
    });
    this.ui.main.el.classList.toggle('d-none', true);
  }

  async handleSignIn() {
    this.ui.menu.el.classList.toggle('d-none', true);

    // TODO: change message to Signing in...
    this.ui.main.el.replaceChild(this.ui.loading.el, this.ui.main.el.firstElementChild);
    this.ui.main.el.classList.toggle('d-none', false);

    await this.signIn();
    this.handleAuthenticated();
  }

  async handleSignOut() {
    // TODO: change message to Signing out...

    this.ui.menu.el.classList.toggle('d-none', true);
    this.ui.main.el.replaceChild(this.ui.loading.el, this.ui.main.el.firstElementChild);
    this.ui.main.el.classList.toggle('d-none', false);

    await this.signOut();
    this.handleUnauthenticated();
  }

  async handleAuthenticated() {
    // TODO: change message to Loading...

    let datasets;
    try {
      datasets = await this.fetchDatasets({ retryAuthenticate: false });
    } catch (error) {
      this.handleUnauthenticated(error);
      return;
    }
    this.handleDatasetsFetched(datasets);
  }

  handleDatasetsFetched(datasets) {
    this.datasets = datasets;

    const onClicked = console.log.bind(console);  // TODO
    this.ui.summary.render({ summary: this.datasets.summary, onClicked });
    this.ui.expenses.render({ expenses: this.datasets.expenses, onClicked });
    this.ui.menu.render({
      visible: true,
      items: [
        { id: 'expenses', label: 'Expenses', onClicked: this.handleShowExpenses.bind(this)},
        { id: 'logout', label: 'Logout', onClicked: this.handleSignOut.bind(this) },
      ]
    });
    this.ui.main.el.replaceChild(this.ui.summary.el, this.ui.main.el.firstElementChild);
    this.ui.menu.el.classList.toggle('d-none', false);
  }

  handleShowSummary() {
    this.ui.menu.render({
      visible: true,
      items: [
        { id: 'expenses', label: 'Expenses', onClicked: this.handleShowExpenses.bind(this)},
        { id: 'logout', label: 'Logout', onClicked: this.handleSignOut.bind(this) },
      ]
    });
    this.ui.main.el.replaceChild(this.ui.summary.el, this.ui.main.el.firstElementChild);
  }

  handleShowExpenses() {
    this.ui.menu.render({
      visible: true,
      items: [
        { id: 'summary', label: 'Summary', onClicked: this.handleShowSummary.bind(this)},
        { id: 'logout', label: 'Logout', onClicked: this.handleSignOut.bind(this) },
      ]
    });
    this.ui.main.el.replaceChild(this.ui.expenses.el, this.ui.main.el.firstElementChild);
  }

  async init() {
    const token = this.services.storage.token();
    await this.services.init({ token });
  }

  async signIn() {
    const token = await this.services.authenticator.signIn();
    this.services.storage.setToken(token);
  }

  async signOut() {
    await this.services.authenticator.signOut();
    this.services.storage.clearToken();
  }

  async fetchDatasets({ retryAuthenticate } = {}) {
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
      const unauthenticated = error.code === 401 || error.code === 403;
      if (!unauthenticated || !retryAuthenticate) {
        throw error;
      }
      await this.signIn();
      await this.fetchDatasets();
      return;
    }

    const summary = new SummaryToDateDataset({ expenses, categories, yearToDate: new Date() });

    return { expenses, categories, summary };
  }
}


class Ui {
  constructor(el) {
    this.el = el;
    this.menu = new Menu(this.el.querySelector('nav.menu'));
    this.summary = new SummaryTable(SummaryTable.createElement());
    this.expenses = new ExpensesTable(ExpensesTable.createElement());
    this.loading = { el: this.el.querySelector('.label-loading') };
    this.main = { el: this.el.querySelector('main') };
  }
}
