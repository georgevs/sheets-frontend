class Menu {
  static createElement(classNames = []) {
    const el = document.createElement('nav');
    el.classList.add('menu', ...classNames);
    return el;
  }
  constructor(el) {
    this.el = el;
    this.items = new Map();
  }
  render({ visible, items }) {
    if (items) {
      [document.createElement('ol')].forEach(ol => {
        this.items.clear();
        this.el.querySelector('ol')?.remove();
        items.map(item => [item.id, new MenuItem(MenuItem.createElement(item)).render(item)])
          .forEach(([id, item]) => {
            if (id) { this.items.set(id, item) }
            ol.appendChild(item.el);
          });
        this.el.appendChild(ol);
      });
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }
    return this;
  }
}

class MenuItem {
  static createElement({ classNames = [] }) {
    const el = document.createElement('li');
    el.classList.add('item', ...classNames);
    return el;
  }
  constructor(el) {
    this.el = el;
  }
  render({ id, label, visible, onClicked }) {
    if (label) {
      [document.createElement('a')].forEach(link => {
        link.textContent = label.toString();
        this.el.appendChild(link);
      });
    }
    if (visible !== undefined) {
      this.el.classList.toggle('d-none', !visible);
    }
    if (onClicked) {
      if (this.removeClickedHandler) {
        this.removeClickedHandler();
      }
      function handleClicked() {
        onClicked({ id });
      }
      this.el.addEventListener('click', handleClicked);
      this.removeClickedHandler = () => {
        tbody.removeEventListener('click', handleClicked);
      };
    }
    return this;
  }
}
