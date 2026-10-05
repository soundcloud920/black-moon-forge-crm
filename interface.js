window.BMF_SETUP_INTERFACE = function () {
  const dialog = document.querySelector('#expenseDialog');
  const newButton = document.querySelector('#newExpenseButton');
  const descriptions = {
    expenses: ['Расходы', 'Планируйте платежи, собирайте взносы и следите за остатком.'],
    contributions: ['Взносы участников', 'Общий вклад каждого участника за всё время.'],
    activity: ['История изменений', 'Кто и когда изменил расходы, оплаты и взносы.'],
  };
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.view;
    document.querySelectorAll('[data-page]').forEach(page => { page.hidden = page.dataset.page !== view; });
    document.querySelectorAll('[data-view]').forEach(item => {
      item.classList.toggle('is-active', item === button);
      if (item === button) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
    });
    document.querySelector('#pageTitle').textContent = descriptions[view][0];
    document.querySelector('#pageDescription').textContent = descriptions[view][1];
    newButton.hidden = view !== 'expenses';
    if (view === 'activity' && document.querySelector('#toggleActivityButton').getAttribute('aria-expanded') === 'false') {
      document.querySelector('#toggleActivityButton').click();
    }
  }));
  newButton.addEventListener('click', () => { dialog.showModal(); dialog.querySelector('[name="contractor"]').focus(); });
  ['#closeExpenseDialog', '#cancelExpenseDialog'].forEach(selector => document.querySelector(selector).addEventListener('click', () => dialog.close()));
  document.querySelector('#expenseForm').addEventListener('submit', () => {
    dialog.close();
    document.querySelector('#resetFilters').click();
    if (list.firstElementChild) expanded.add(list.firstElementChild.dataset.id);
    newButton.focus();
  });
  document.querySelector('#resetFilters').addEventListener('click', () => {
    ['#searchInput', '#monthFilter'].forEach(selector => {
      const input = document.querySelector(selector); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.querySelector('[data-filter="active"]').click();
  });
  const list = document.querySelector('#expenseList');
  const expanded = new Set();
  document.querySelectorAll('[data-filter], [data-theme-choice]').forEach(button => {
    const update = () => button.setAttribute('aria-pressed', String(button.classList.contains('is-active')));
    update();
    new MutationObserver(update).observe(button, { attributes: true, attributeFilter: ['class'] });
  });
  let focusedField = null;
  list.addEventListener('focusin', event => {
    const card = event.target.closest('.expense-card');
    if (!card) return;
    const inputs = [...card.querySelectorAll('input')];
    focusedField = { id: card.dataset.id, index: inputs.indexOf(event.target) };
  });
  list.addEventListener('focusout', event => {
    if (event.relatedTarget && !list.contains(event.relatedTarget)) focusedField = null;
  });
  function refresh() {
    list.querySelectorAll('.expense-card').forEach(card => {
      const detail = card.querySelector('details');
      detail.open = expanded.has(card.dataset.id) || !card.querySelector('.edit-area').hidden;
      detail.addEventListener('toggle', () => {
        if (!detail.isConnected) return;
        if (detail.open) expanded.add(card.dataset.id); else expanded.delete(card.dataset.id);
      });
    });
    if (focusedField && (document.activeElement === document.body || !document.activeElement?.isConnected)) {
      const card = [...list.querySelectorAll('.expense-card')].find(item => item.dataset.id === focusedField.id);
      card?.querySelectorAll('input')[focusedField.index]?.focus({ preventScroll: true });
    }
  }
  new MutationObserver(refresh).observe(list, { childList: true });
  refresh();
};
