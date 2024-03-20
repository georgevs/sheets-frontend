class SummaryTable {
  constructor(el) {
    this.el = el;
  }

  static createElement(classNames = []) {
    const el = document.createElement('table');
    el.classList.add('summary', ...classNames);
    return el;
  }

  render({ onClicked, summary, visible }) {
    const header = ['ACCT', 'YTD', 'PYT', 'LDT', 'LAM'];  // also determines columns order

    if (summary) {
      this.renderSummary({ header, summary });
    }
    if (onClicked) {
      this.updateHandlers({ header, onClicked });
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }

    return this;
  }

  renderSummary({ header, summary }) {
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

      const categories = ['income', 'utilities', 'medical', 'sport', 'expense'];  // also determines sections order
      const sections = categories.map(category => [
        ...summary.categorySummary.get(category), 
        summary.categoryTotalSummary.get(category)
      ]);
      sections.forEach((rows) => {
        rows.map(row => [row, document.createElement('tr')])
          .forEach(([row, tr]) => {
            const account = row.account() ?? row.label();
            const rowValues = new Map([
              ['ACCT', account],
              ['LAM', Format.amount(row.lastAmount())],
              ['LDT', Format.shortDay(row.lastDate())],
              ['PYT', Format.amount(row.prevYearTotal())],
              ['YTD', Format.amount(row.yearToDateTotal())],
            ]);
            const colClassNames = new Map([
              ['LAM', ['amount']],
              ['PYT', ['amount']],
              ['YTD', ['amount']],
            ]);
            header.map(col => [colClassNames.get(col), document.createTextNode(rowValues.get(col)), document.createElement('td')])
              .forEach(([classNames, text, td]) => {
                if (classNames) { td.classList.add(...classNames) }
                td.appendChild(text);
                tr.appendChild(td);
              });
              
            tr.dataset.account = row.account();
            
            tr.classList.toggle('total', row.kind() === 'total' || row.kind() === 'all');
            tr.classList.toggle('all', row.kind() === 'all');  

            tbody.appendChild(tr);
          });
      });

      this.el.appendChild(tbody);
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
}
