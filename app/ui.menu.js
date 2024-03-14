class Menu {
  static createElement() {
    const el = document.createElement('nav');
    el.classList.add('menu');
    return el;
  }
  constructor(el) {
    this.el = el;
  }
  render() {
    const items = [
      { label: 'Login' },
      { label: 'Logout' },
      { label: 'Expenses' },
      { label: 'Summary' },
    ];
    items.map(item => new MenuItem(MenuItem.createElement()).render(item))
    .forEach(link => {
      this.el.appendChild(link);
    });
  }
}

class MenuItem {
  static createElement() {
    const el = document.createElement('li');
    el.classList.add('item');
    return el;
  }
  constructor(el) {
    this.el = el;
  }
  render({ label }) {
    [document.createElement('link')].forEach(link => {
      link.textContent = label.toString();
      this.el.appendChild(link);
    });
  }
}
