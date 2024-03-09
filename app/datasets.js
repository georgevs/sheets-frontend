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
  constructor({ expenses, date }) {
    const prevYearDate = new Date(date.getFullYear()-1, 0);

    const selectInDateInterval = (row) => (prevYearDate <= row.date() && row.date() <= date);

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
    
    const summary = (account, expenses) => ({ 
      account: account,
      yearToDateTotal: totalAmount(date.getFullYear(), expenses),
      prevYearTotal: totalAmount(prevYearDate.getFullYear(), expenses),
      lastDate: expenses[0].date(),
      lastAmount: expenses[0].amount()
    });

    let result = expenses.rows;
    result = result.filter(selectInDateInterval);
    result = result.sort(orderByAccountAndReverseDate);
    result = Array.from(result.groupBy(rowAccount));
    result = result.map(([account, expenses]) => new SummaryRow(summary(account, expenses)));

    this.rows = result;
  }
}

class SummaryRow extends Array {
  constructor({ account, yearToDateTotal, prevYearTotal, lastDate, lastAmount }) {
    super(account, yearToDateTotal, prevYearTotal, lastDate, lastAmount);
  }
  account() { return this[0] }
  yearToDateTotal() { return this[1] }
  prevYearTotal() { return this[2] }
  lastDate() { return this[3] }
  lastAmount() { return this[4] }
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
  static day(dt) { return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` }
  static weekDay(dt) { return `${Format.weekday[dt.getDay()]} ${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` }
  static month(dt) { return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` }
  static amount(amnt) { return amnt.toFixed(0) }
  static weekday = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
}
