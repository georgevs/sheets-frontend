class Ui {
  constructor(el) {
    this.el = el;
    this.menu = new Menu(this.el.querySelector('nav.menu'));
    this.summary = new SummaryTable(SummaryTable.createElement());
    this.expenses = new ExpensesTable(ExpensesTable.createElement());
    this.message = new MessageLabel(this.el.querySelector('.label-message'));
    this.main = new Main(this.el.querySelector('main'));
  }
  
  render({ message }) {
    if (message !== undefined) {
      this.message.render({ text: message });
      this.main.render({ present: this.message });
    }
  }
}


class Main {
  constructor(el) {
    this.el = el;
  }

  render({ visible, present: component }) {
    if (component) {
      this.el.replaceChild(component.el, this.el.firstElementChild);
      component.render({ visible: true });
      visible = true;  // enforce visible
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }
    return this;
  }
}

class MessageLabel {
  constructor(el) {
    this.el = el;
  }
  
  render({ text, visible }) {
    if (text !== undefined) {
      this.el.textContent = text.toString();
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }
    return this;
  }
}
