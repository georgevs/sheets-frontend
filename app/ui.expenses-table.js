class ExpensesTable {
  constructor(el) {
    this.el = el;
  }

  static createElement(classNames = []) {
    const el = document.createElement('table');
    el.classList.add('expenses', ...classNames);
    return el;
  }

  render({ expenses, filter, onClicked, visible }) {
    const header = ['DT', 'AMNT', 'ACCT'];  // also determines columns order

    if (expenses) {
      this.renderExpenses({ header, expenses });
    }
    if (filter) {
      this.applyFilter({ header, filter });
    }
    if (onClicked) {
      this.updateHandlers({ header, onClicked });
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }

    return this;
  }

  renderExpenses({ header, expenses }) {
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
            ['ACCT', row.account()],
            ['AMNT', Format.amount(row.amount())], 
            ['DT', Format.weekDay(row.date())], 
          ]);
          const colClassNames = new Map([
            ['AMNT', ['amount']],
          ]);
          header.map(col => [colClassNames.get(col), document.createTextNode(rowValues.get(col)), document.createElement('td')])
            .forEach(([classNames, text, td]) => {
              if (classNames) { td.classList.add(...classNames) }
              td.appendChild(text);
              tr.appendChild(td);
            });

          tr.dataset.account = row.account();
          tr.dataset.day = Format.day(row.date());
          tr.dataset.month = Format.month(row.date());

          // tr.classList.toggle('expenses', ...);
          // tr.classList.toggle('utilities', ...);
          // tr.classList.toggle('income', ...);

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
