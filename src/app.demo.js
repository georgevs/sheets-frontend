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
