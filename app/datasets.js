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
  static weekDay(dt) { return dt === undefined ? '' : `${Format.weekday[dt.getDay()]} ${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')} '${dt.getFullYear().toString().slice(-2)}` }
  static month(dt) { return dt === undefined ? '' : `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` }
  static amount(amnt) { return amnt === undefined ? '' : amnt.toFixed(0) }
  static weekday = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
}
