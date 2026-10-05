// Runs inside the decrypted application's scope, after its own initialization.
// Storage, encryption and realtime synchronization remain owned by that scope.
window.BMF_WRAP_CORE = source => source + '\n' + String.raw`
const notifyInterface = () => window.dispatchEvent(new Event('bmf:change'));
const savedRender = render;
render = function () { savedRender(); notifyInterface(); };
const findRecord = (id, expectedUpdatedAt) => {
  const item = state.expenses.find(expense => expense.id === id);
  if (!item) throw new Error('Расход не найден. Обновите страницу.');
  if (expectedUpdatedAt !== undefined && (item.updatedAt || '') !== expectedUpdatedAt) {
    throw new Error('Этот расход уже изменили. Закройте его и откройте снова, чтобы увидеть свежие данные.');
  }
  return item;
};
const checkedFields = input => {
  const total = Number(input.total), paid = Number(input.paid || 0);
  const firstPercent = Number(input.firstPercent ?? 100);
  if (!clean(input.title) || !clean(input.contractor) || !/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')) throw new Error('Заполните дату, название и подрядчика.');
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(paid) || paid < 0) throw new Error('Укажите стоимость больше нуля. Оплаченная сумма не может быть отрицательной.');
  if (!Number.isFinite(firstPercent) || firstPercent < 0 || firstPercent > 100) throw new Error('Первый платёж должен быть от 0 до 100%.');
  const contributions = Object.fromEntries(users.map(user => {
    const value = Number(input.contributions?.[user.id] || 0);
    if (!Number.isFinite(value) || value < 0) throw new Error('Взнос не может быть отрицательным.');
    return [user.id, value];
  }));
  return {date:input.date,title:clean(input.title),contractor:clean(input.contractor),total,paid,firstPercent,note:clean(input.note),contributions};
};
window.BMF_CORE = {
  read() {
    return {users:structuredClone(users),activity:structuredClone(state.activity || []),expenses:state.expenses.map(expense => ({...structuredClone(expense),calculated:calculateExpense(expense),displayStatus:getExpenseStatus(expense)}))};
  },
  create(input) {
    const fields = checkedFields(input), now = new Date().toISOString();
    const item = {...fields,id:crypto.randomUUID(),status:'auto',archivedAt:'',createdAt:now,updatedAt:now};
    state.expenses.unshift(item);
    recordActivity('create','Добавлен расход: ' + item.title);
    saveAndRender();
    return item.id;
  },
  update(id,input,expectedUpdatedAt) {
    const item = findRecord(id,expectedUpdatedAt), fields = checkedFields(input);
    const previous = structuredClone(item);
    if (Object.keys(fields).every(key => JSON.stringify(fields[key]) === JSON.stringify(item[key]))) return;
    updateExpense(id,record => Object.assign(record,fields));
    if (previous.paid !== fields.paid) recordActivity('payment','Оплата по расходу «' + fields.title + '»: ' + money(previous.paid) + ' → ' + money(fields.paid));
    users.forEach(user => { if ((previous.contributions?.[user.id] || 0) !== fields.contributions[user.id]) recordActivity('contribution',user.name + ' внёс на «' + fields.title + '»: ' + money(previous.contributions?.[user.id] || 0) + ' → ' + money(fields.contributions[user.id])); });
    if (['title','contractor','date','total','firstPercent','note'].some(key => previous[key] !== fields[key])) recordActivity('edit','Изменён расход: ' + fields.title);
    saveAndRender();
  },
  archive(id,expectedUpdatedAt) {
    const item = findRecord(id,expectedUpdatedAt), archived = Boolean(item.archivedAt);
    updateExpense(id,record => { record.archivedAt = archived ? '' : new Date().toISOString(); });
    recordActivity('archive',(archived ? 'Возвращён из архива: ' : 'В архиве: ') + item.title);
    saveAndRender();
  },
  toggleClosed(id,expectedUpdatedAt) {
    const item = findRecord(id,expectedUpdatedAt), closed = item.status === 'closed';
    updateExpense(id,record => { record.status = closed ? 'auto' : 'closed'; });
    recordActivity('status',(closed ? 'Открыт расход: ' : 'Закрыт расход: ') + item.title);
    saveAndRender();
  },
  exportCsv, exportJson,
  theme(value) { setTheme(value); localStorage.setItem('bmf-crm-theme-v2', value); },
  logout() { els.logoutButton.click(); }
};
els.expenseForm.elements.firstPercent.value = 100;
`;
