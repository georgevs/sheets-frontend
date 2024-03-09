class ExpensesTable {
  constructor(el) {
    this.el = el;
  }

  static createElement(classNames = []) {
    const el = document.createElement('table');
    el.classList.add('expenses', ...classNames);
    return el;
  }

  render({ expenses, filter, onClicked }) {
    const header = ['DT', 'AMNT', 'ACCT'];  // also determines columns order

    this.renderExpenses({ header, expenses });
    this.applyFilter({ header, filter });
    this.updateHandlers({ header, onClicked });

    return this;
  }

  renderExpenses({ header, expenses }) {
    if (!expenses) { return }

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
          const rowValues = new Map([
            ['DT', Format.day(row.date())], 
            ['AMNT', Format.amount(row.amount())], 
            ['ACCT', row.account()]
          ]);
          header.map(col => [document.createTextNode(rowValues.get(col)), document.createElement('td')])
            .forEach(([text, td]) => {
              td.appendChild(text);
              tr.appendChild(td);
            });

          tr.dataset.account = row.account();
          tr.dataset.day = Format.day(row.date());
          tr.dataset.month = Format.month(row.date());

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
