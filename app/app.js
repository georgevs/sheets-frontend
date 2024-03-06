window.addEventListener('load', () => { window.app = new App() });


class App {
  constructor() {
    this.services = new Services();
  }
}


class Dataset {
  constructor({ values }) {
    const index = new Map(values[0].map((x,i) => [x,i]));
    this.rows = values.flatMap(row => {
      try {
        const dt = new Date(row[index.get('DT')]);
        const amnt = Number.parseFloat(row[index.get('AMNT')]);
        const acct = row[index.get('ACCT')].trim();
        const isValidRow = !isNaN(dt.getFullYear()) &&
                           !isNaN(amnt) &&
                           acct.length > 0;
        return isValidRow ? [new Row({ dt, amnt, acct })] : []
      } catch {
        return [];
      }
    });
  }
}

class Row extends Array {
  constructor({ dt, amnt, acct }) {
    super(dt, amnt, acct);
  }
  dt() { return this[0] }
  amnt() { return this[1] }
  acct() { return this[2] }
  month() { const dt = this.dt(); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` }
  date() { const dt = this.dt(); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` }
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


class ExpensesTable {
  constructor(el) {
    this.el = el;
  }

  static createElement(classNames = []) {
    const el = document.createElement('table');
    el.classList.add('expenses', ...classNames);
    return el;
  }

  render({ dataset, filter, onClicked }) {
    const header = ['DT', 'AMNT', 'ACCT'];  // also determines columns order

    this.renderDataset({ header, dataset });
    this.applyFilter({ header, filter });
    this.updateHandlers({ header, onClicked });

    return this;
  }

  renderDataset({ header, dataset }) {
    if (!dataset) { return }

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
      dataset.rows.map(row => [row, document.createElement('tr')])
        .forEach(([row, tr]) => {
          const rowValues = new Map([['DT', row.date()], ['AMNT', row.amnt()], ['ACCT', row.acct()]]);
          header.map(col => [document.createTextNode(rowValues.get(col)), document.createElement('td')])
            .forEach(([text, td]) => {
              td.appendChild(text);
              tr.appendChild(td);
            });

          tr.dataset.date = row.date();
          tr.dataset.account = row.acct();
          tr.dataset.month = row.month();

          // const categories = Array.from(accountsByCategory.entries())
          //   .flatMap(([category, categoryAccounts]) => categoryAccounts.has(account) ? [category] : []);
          // tr.classList.add(...categories);

          tbody.appendChild(tr);
        });

      this.el.appendChild(tbody);
    });
  }

  applyFilter({ header, filter }) {
    Array.from(this.el.tBodies).forEach(tbody => {
      const highlightSameDayRows = ExpensesTable.highlightSameDayRows.bind(null, {});
      const mergeSameDayCells = ExpensesTable.mergeSameDayCells.bind(null, { dateCellIndex: header.indexOf('DT') });

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
    if (onClicked) {
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

  static highlightSameDayRows(state, tr) {
    const date = tr.dataset.date;
    if (state.lastDate !== date) {
      state.lastDate = date;
      state.highlight = !state.highlight;
    }
    tr.classList.toggle('highlighted', !state.highlight);
  }

  static mergeSameDayCells(state, tr) {
    const date = tr.dataset.date;
    const dateCell = tr.cells[state.dateCellIndex];
    if (state.lastDate !== date) {
      state.lastDate = date;
      state.lastDateCell = dateCell;
    }
    const isLastDateCell = (dateCell === state.lastDateCell);
    dateCell.classList.toggle('d-none', !isLastDateCell);
    dateCell.rowSpan = 1;
    state.lastDateCell.rowSpan += (isLastDateCell ? 0 : 1);
  }
}


class Services {
  constructor() {
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
