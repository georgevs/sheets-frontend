window.addEventListener('load', () => { (window.app = new App()).dispatch({ init: true }) });

class App {
  constructor() {
    this.services = new Services();
    this.ui = new Ui(document.body);
    this.datasets = {};

    document.addEventListener('app:action', async ({ detail }) => { await this.handleEvent(detail) });
  }

  dispatch(detail) {
    document.dispatchEvent(new CustomEvent('app:action', { detail }));
  }
  async handleEvent(event) {
    // TODO
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

    this.datasets.expenses = expenses;
    this.datasets.categories = categories;
    this.datasets.summary = summary;
  }
}


class Ui {
  constructor(el) {
    this.el = el;
    this.menu = new Menu(this.el.querySelector('nav.menu'));
    this.summary = new SummaryTable(SummaryTable.createElement());
    this.expenses = new ExpensesTable(ExpensesTable.createElement());
  }
}
