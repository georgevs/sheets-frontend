class SummaryTable {
  constructor(el) {
    this.el = el;
  }

  static createElement(classNames = []) {
    const el = document.createElement('table');
    el.classList.add('summary', ...classNames);
    return el;
  }

  render({ summary }) {
    const header = ['ACCT', 'YTDT', 'PYT', 'LDT', 'LAMNT'];  // also determines columns order

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
      summary.rows.map(row => [row, document.createElement('tr')])
        .forEach(([row, tr]) => {
          const rowValues = new Map([
            ['ACCT', row.account()],
            ['YTDT', Format.amount(row.yearToDateTotal())],
            ['PYT', Format.amount(row.prevYearTotal())],
            ['LDT', Format.day(row.lastDate())],
            ['LAMNT', Format.amount(row.lastAmount())],
          ]);
          header.map(col => [document.createTextNode(rowValues.get(col)), document.createElement('td')])
            .forEach(([text, td]) => {
              td.appendChild(text);
              tr.appendChild(td);
            });

          tbody.appendChild(tr);
        });

      this.el.appendChild(tbody);
    });

    return this;
  }
}
