class ExpensesDataset {
  constructor({ values }) {
    const index = new Map(values[0].map((x,i) => [x,i]));
    this.rows = values.flatMap(row => {
      try {
        const date = new Date(row[index.get('DT')]);
        const amount = Number.parseFloat(row[index.get('AMNT')]);
        const account = row[index.get('ACCT')].trim();
        const isValidRow = !isNaN(date.getFullYear()) &&
                           !isNaN(amount) &&
                           account.length > 0;
        return isValidRow ? [new ExpenseRow({ date, amount, account })] : []
      } catch {
        return [];
      }
    });
  }
}

class ExpenseRow extends Array {
  constructor({ date, amount, account }) {
    super(date, amount, account);
  }
  date() { return this[0] }
  amount() { return this[1] }
  account() { return this[2] }
  month() { const date = this.date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}` }
  day() { const date = this.date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
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
