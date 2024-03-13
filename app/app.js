window.addEventListener('load', () => { (window.app = new App()).init() });


class App {
  constructor() {
    this.services = new Services();
    this.ui = {};  // TODO
    this.datasets = {};  // TODO
  }
  
  async init() {
    const token = this.services.storage.token();
    await this.services.init({ token });

    if (this.services.authenticator.isSignedIn()) {
      this.fetchDatasets();
    }
  }

  async authenticate() {
    const token = await app.services.authenticator.signIn();
    this.services.storage.setToken(token);
    this.fetchDatasets();
  }

  async fetchDatasets() {
    const spreadsheetId = '1UbJN1IUOu28ujbab_zkdYrPaoIS3uByk3twBACqTxh4';
    let categories, expenses;
    try {
      categories = await this.services.spreadsheets.getValues({
        spreadsheetId, range: 'CATX'
      });
      expenses = await this.services.spreadsheets.getValues({
        spreadsheetId, range: 'BAL'
      });
    }
    catch (ex) {
      // error { code: 401, status: 'UNAUTHENTICATED' } if invalid token (revoked or expired)
      // error { code: 403, status: 'PERMISSION_DENIED' } if no token
      console.log(ex);
      this.authenticate();
      return;
    }
    
    this.datasets.expenses = new ExpensesDataset({ values: expenses });
    this.datasets.categories = new CategoriesDataset({ values: categories });
    this.datasets.summary = new SummaryToDateDataset({ 
      expenses: this.datasets.expenses, 
      categories: this.datasets.categories,
      yearToDate: new Date()
    });

    this.updateUi();
  }

  updateUi() {
    this.ui.expenses = new ExpensesTable(ExpensesTable.createElement())
      .render({ expenses: this.datasets.expenses });
    document.body.replaceChild(this.ui.expenses.el, document.body.querySelector('.label-loading'))
  }
}
