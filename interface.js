window.BMF_SETUP_INTERFACE = function () {
  const core = window.BMF_CORE;
  if (window.BMF_IS_PREVIEW) document.querySelector('.studio-name').textContent = 'Предпросмотр · тестовые записи';
  if (!core) throw new Error('CRM interface bridge was not initialized');
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = value => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:2}).format(Number(value) || 0);
  const amount = value => number(value) + ' USDT';
  const expenseCount = count => count + ' ' + (count % 100 >= 11 && count % 100 <= 14 ? 'расходов' : count % 10 === 1 ? 'расход' : count % 10 >= 2 && count % 10 <= 4 ? 'расхода' : 'расходов');
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Kyiv'}).formatToParts(new Date()).map(part => [part.type,part.value]));
  const today = dateParts.year + '-' + dateParts.month + '-' + dateParts.day;
  const dates = value => value ? new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value + 'T12:00:00')) : 'Без даты';
  const iconPaths = {
    overview:'M3 13h7v8H3z M14 3h7v18h-7z M3 3h7v6H3z',
    expenses:'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h4',
    members:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    history:'M3 12a9 9 0 1 0 3-6.7 M3 3v6h6 M12 7v5l3 2',
    archive:'M3 3h18v5H3z M5 8v13h14V8 M10 12h4',
    calendar:'M3 5h18v16H3z M16 3v4 M8 3v4 M3 11h18',
    download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
    plus:'M12 5v14 M5 12h14',
    search:'M21 21l-5-5 M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14',
    close:'M6 6l12 12 M6 18L18 6',
    sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
    moon:'M21 12.7A9 9 0 1 1 11.3 3 7 7 0 0 0 21 12.7',
    logout:'M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4',
    arrow:'M5 12h14 M14 7l5 5-5 5',
  };
  const svgIcon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[name] || iconPaths.expenses}"/></svg>`;
  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = svgIcon(node.dataset.icon); });
  const labels = {planned:'Ждёт взносов',collecting:'Собираем взносы',ready:'Можно оплатить',partial:'Оплачено частично',closed:'Закрыт',archived:'В архиве'};
  const statusMarkup = record => `<span class="record-status status-${esc(record.displayStatus.key)}"><i></i>${labels[record.displayStatus.key] || esc(record.displayStatus.label)}</span>`;
  const ui = {page:'overview',period:'all',status:'active',query:'',sort:'date',direction:-1,selectedId:null,selectedVersion:undefined,drawerTab:'payments'};
  let snapshot = core.read();
  const dialog = $('#recordDrawer'), form = $('#recordForm');
  let returnFocus = null;

  function inPeriod(date) {
    if (ui.period === 'all') return true;
    if (!date) return false;
    const month = today.slice(0,7);
    if (ui.period === 'month') return date.slice(0,7) === month;
    const start = new Date(month + '-01T12:00:00');
    start.setMonth(start.getMonth() - 5);
    const first = start.getFullYear() + '-' + String(start.getMonth()+1).padStart(2,'0');
    return date.slice(0,7) >= first && date.slice(0,7) <= month;
  }
  function visibleRecords(includeArchive = false) {
    return snapshot.expenses.filter(record => (includeArchive || !record.archivedAt) && inPeriod(record.date));
  }
  function totals(records) {
    return records.reduce((result,record) => {
      result.cost += record.total; result.collected += record.calculated.collected; result.paid += record.paid;
      if (record.displayStatus.key !== 'closed') result.unpaid += Math.max(0, record.total - record.paid);
      return result;
    },{cost:0,collected:0,paid:0,unpaid:0});
  }
  function memberTotals(records) {
    return snapshot.users.map(user => ({...user,total:records.reduce((sum,record) => sum + (record.contributions[user.id] || 0),0)}));
  }
  function showToast(message) {
    const node = document.createElement('div'); node.className = 'app-toast'; node.textContent = message;
    $('#appToasts').append(node); setTimeout(() => node.remove(),3500);
  }
  function fillTable(container, markup) {
    const focused = document.activeElement;
    const key = container.contains(focused) ? (focused.dataset.open ? ['open',focused.dataset.open] : focused.dataset.sort ? ['sort',focused.dataset.sort] : null) : null;
    container.innerHTML = markup;
    if (key && !dialog.open) {
      const replacement = [...container.querySelectorAll('button')].find(button => button.dataset[key[0]] === key[1]);
      if (replacement) replacement.focus({preventScroll:true});
      else { $('#screenTitle').tabIndex = -1; $('#screenTitle').focus({preventScroll:true}); }
    }
  }
  function table(records, compact = false) {
    if (!records.length) return `<div class="empty-report"><h3>${ui.query ? 'Нет совпадений' : 'Здесь пока пусто'}</h3><p>${ui.query ? 'Попробуйте другое название или имя подрядчика.' : (ui.page === 'archive' ? 'Расходы появятся здесь после отправки в архив.' : 'Выберите другой период или добавьте расход.')}</p></div>`;
    const columns = [['title','Расход'],['date','Дата'],['status','Статус'],['total','Стоимость'],['collected','Внесено'],['paid','Оплачено'],['unpaid','Ещё оплатить']];
    const headings = columns.map(([key,title]) => `<th scope="col"${!compact && key === ui.sort ? ' aria-sort="' + (ui.direction === 1 ? 'ascending' : 'descending') + '"' : ''}>${compact ? title : `<button data-sort="${key}">${title}<span class="sort-arrow">${key === ui.sort ? (ui.direction === 1 ? '↑' : '↓') : '↕'}</span></button>`}</th>`).join('');
    const rows = records.map(record => `<tr><td><button class="record-name" data-open="${esc(record.id)}">${esc(record.title)}</button><span class="contractor-name">${esc(record.contractor)}</span></td><td class="date-cell">${dates(record.date)}</td><td>${statusMarkup(record)}</td><td class="numeric">${number(record.total)}</td><td class="numeric muted-value">${number(record.calculated.collected)}</td><td class="numeric paid-value">${number(record.paid)}</td><td class="numeric ${record.total > record.paid ? 'unpaid-value' : 'muted-value'}">${number(Math.max(0,record.total-record.paid))}</td><td><button class="row-open icon-button" data-open="${esc(record.id)}" aria-label="Открыть расход ${esc(record.title)}">${svgIcon('arrow')}</button></td></tr>`).join('');
    return `<table class="expense-table"><thead><tr>${headings}<th scope="col"><span class="sr-only">Открыть</span></th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function renderOverview() {
    const records = visibleRecords(), sum = totals(records), balance = sum.collected - sum.paid;
    $('#financeStrip').innerHTML = `<div class="main-figure ${balance < 0 ? 'negative-figure' : ''}"><span>${balance < 0 ? 'Оплатили сверх взносов' : 'Не потрачено'}</span><strong>${number(Math.abs(balance))}<small>USDT</small></strong><p>${balance < 0 ? 'Оплаты превысили собранную сумму' : 'Взносы за вычетом оплат'}</p></div><div class="finance-figure"><span>Собрано взносов</span><strong>${number(sum.collected)}<small>USDT</small></strong></div><div class="finance-figure"><span>Уже оплачено</span><strong>${number(sum.paid)}<small>USDT</small></strong></div><div class="finance-figure"><span>Ещё оплатить</span><strong>${number(sum.unpaid)}<small>USDT</small></strong></div>`;
    renderMonthlyChart(records); renderMemberChart(records);
    const attention = records.filter(record => record.displayStatus.key !== 'closed' && record.total > record.paid).sort((a,b) => (b.total-b.paid)-(a.total-a.paid)).slice(0,5);
    fillTable($('#attentionTable'),attention.length ? table(attention,true) : '<div class="empty-report"><h3>Открытых оплат нет</h3><p>Все расходы за этот период оплачены или закрыты.</p></div>');
  }
  function renderMonthlyChart(records) {
    const dated = records.filter(record => /^\d{4}-\d{2}-\d{2}$/.test(record.date)).sort((a,b) => a.date.localeCompare(b.date));
    if (!dated.length) { $('#monthlyChart').innerHTML = '<div class="chart-empty">График появится, когда добавите расход с датой.</div>'; return; }
    let first = dated[0].date.slice(0,7), last = dated[dated.length-1].date.slice(0,7);
    if (ui.period === 'month') first = last = today.slice(0,7);
    const buckets = new Map();
    const start = new Date(first+'-01T12:00:00'), end = new Date(last+'-01T12:00:00');
    const monthCount = (end.getFullYear()-start.getFullYear())*12 + end.getMonth()-start.getMonth()+1;
    const byYear = monthCount > 18;
    for (const cursor = new Date(start); cursor <= end; cursor.setMonth(cursor.getMonth()+1)) {
      const key = byYear ? String(cursor.getFullYear()) : cursor.getFullYear()+'-'+String(cursor.getMonth()+1).padStart(2,'0');
      if (!buckets.has(key)) buckets.set(key,{cost:0,paid:0});
    }
    dated.forEach(record => { const bucket = buckets.get(record.date.slice(0,byYear ? 4 : 7)); bucket.cost += record.total; bucket.paid += record.paid; });
    const entries = [...buckets], maximum = Math.max(1,...entries.flatMap(([,item]) => [item.cost,item.paid]));
    const magnitude = 10 ** Math.floor(Math.log10(maximum)), ceiling = Math.ceil(maximum / magnitude) * magnitude;
    const width = 820, height = 262, left = 55, top = 16, bottom = 226, plotWidth = width-left-20, plotHeight = bottom-top;
    const spacing = plotWidth/entries.length, barWidth = Math.min(46,spacing*.28);
    const grid = Array.from({length:5},(_,index) => { const y = top+plotHeight*index/4; return `<line x1="${left}" y1="${y}" x2="800" y2="${y}" class="chart-grid"/><text x="${left-12}" y="${y+4}" text-anchor="end" class="axis-label">${number(ceiling*(1-index/4))}</text>`; }).join('');
    const bars = entries.map(([key,item],index) => {
      const center = left+spacing*(index+.5), costHeight = item.cost/ceiling*plotHeight, paidHeight = item.paid/ceiling*plotHeight;
      let label = byYear ? key : new Intl.DateTimeFormat('ru-RU',{month:'short'}).format(new Date(key+'-01T12:00:00')).replace('.','');
      if (!byYear && first.slice(0,4) !== last.slice(0,4)) label += ' ' + key.slice(2,4);
      const fullLabel = byYear ? key : new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(new Date(key+'-01T12:00:00'));
      return `<g tabindex="0" role="img" aria-label="${esc(fullLabel)}: стоимость ${amount(item.cost)}, оплачено ${amount(item.paid)}"><title>${fullLabel}: стоимость ${amount(item.cost)}, оплачено ${amount(item.paid)}</title><rect x="${center-barWidth-3}" y="${bottom-costHeight}" width="${barWidth}" height="${costHeight}" rx="3" class="cost-bar"/><rect x="${center+3}" y="${bottom-paidHeight}" width="${barWidth}" height="${paidHeight}" rx="3" class="paid-bar"/><text x="${center}" y="250" text-anchor="middle" class="axis-label">${label}</text></g>`;
    }).join('');
    $('#monthlyChart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Стоимость расходов и оплаченная сумма по ${byYear ? 'годам' : 'месяцам'}"><title>Стоимость расходов и оплаченная сумма</title>${grid}${bars}</svg>`;
    $('#timelineTitle').textContent = byYear ? 'Расходы по годам' : 'Расходы по месяцам';
  }
  function renderMemberChart(records) {
    const members = memberTotals(records), total = members.reduce((sum,member) => sum+member.total,0);
    const circumference = 2*Math.PI*68; let offset = 0;
    const colors = ['#8781ff','#58b9d7','#e5b566','#a2c86a','#e585a5'];
    const arcs = members.map((member,index) => { const length = total ? member.total/total*circumference : 0; const arc = `<circle cx="100" cy="100" r="68" fill="none" stroke="${colors[index%colors.length]}" stroke-width="12" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`; offset += length; return arc; }).join('');
    $('#membersChart').innerHTML = `<div class="donut-wrap"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="68" fill="none" stroke="var(--line)" stroke-width="12"/>${arcs}</svg><div class="donut-label"><strong>${number(total)}</strong><span>USDT внесено</span></div></div><div class="member-legend">${members.map((member,index) => `<div><span><i style="background:${colors[index%colors.length]}"></i>${esc(member.name)}</span><strong>${number(member.total)}<small>${total ? Math.round(member.total/total*100) : 0}%</small></strong></div>`).join('')}</div>`;
  }
  function renderExpenses() {
    const archive = ui.page === 'archive';
    let records = snapshot.expenses.filter(record => Boolean(record.archivedAt) === archive && inPeriod(record.date));
    if (!archive && ui.status === 'active') records = records.filter(record => record.displayStatus.key !== 'closed');
    if (!archive && ui.status === 'closed') records = records.filter(record => record.displayStatus.key === 'closed');
    if (ui.query) records = records.filter(record => [record.title,record.contractor,record.note].join(' ').toLocaleLowerCase('ru-RU').includes(ui.query));
    const sortValue = record => ui.sort === 'collected' ? record.calculated.collected : ui.sort === 'unpaid' ? Math.max(0,record.total-record.paid) : ui.sort === 'status' ? labels[record.displayStatus.key] : record[ui.sort];
    records.sort((a,b) => { const first = sortValue(a), second = sortValue(b); return (typeof first === 'number' ? first-second : String(first || '').localeCompare(String(second || ''),'ru-RU'))*ui.direction; });
    fillTable($('#expensesTable'),table(records));
    $('#rowCount').textContent = expenseCount(records.length) + ' · ' + amount(totals(records).cost);
    document.querySelector('.segmented').hidden = archive;
  }
  function renderMembers() {
    const members = memberTotals(visibleRecords(true)), total = members.reduce((sum,member) => sum+member.total,0);
    $('#membersReport').innerHTML = `<div class="member-report-total"><span>Всего внесли</span><strong>${number(total)}<small>USDT</small></strong></div><table class="members-table"><thead><tr><th>Участник</th><th>Внесено, USDT</th><th>Доля взносов</th></tr></thead><tbody>${members.map((member,index) => `<tr><td><span class="member-avatar color-${index%3}">${esc(member.name.slice(0,1))}</span>${esc(member.name)}</td><td class="numeric">${number(member.total)}</td><td><div class="share-line"><span class="share-track"><i style="width:${total ? member.total/total*100 : 0}%"></i></span><span>${total ? Math.round(member.total/total*100) : 0}%</span></div></td></tr>`).join('')}</tbody></table>`;
  }
  function renderHistory() {
    const records = snapshot.activity.filter(item => inPeriod(item.at?.slice(0,10)));
    $('#historyFeed').innerHTML = records.length ? records.map(item => `<article class="history-row"><span class="history-marker"></span><div><p>${esc(item.text)}</p><span>${esc(item.actor || 'Участник')}</span></div><time datetime="${esc(item.at)}">${new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Kyiv'}).format(new Date(item.at))}</time></article>`).join('') : '<div class="empty-report"><h3>Пока без изменений</h3><p>Новые расходы, оплаты и взносы появятся здесь.</p></div>';
  }
  function render() {
    snapshot = core.read();
    $('#navExpenseCount').textContent = snapshot.expenses.filter(record => !record.archivedAt && record.displayStatus.key !== 'closed').length;
    renderOverview(); renderExpenses(); renderMembers(); renderHistory();
  }
  function navigate(page) {
    ui.page = page;
    const titles = {overview:['Обзор','Расходы и взносы без архива'],expenses:['Расходы','Все суммы в USDT'],members:['Участники','Все взносы за выбранный период, включая архив'],history:['История','Последние изменения'],archive:['Архив','Расходы можно вернуть в работу']};
    $('#screenTitle').textContent = titles[page][0]; $('#screenDescription').textContent = titles[page][1];
    $('.period-picker .sr-only').textContent = page === 'history' ? 'Период изменений' : 'Период по дате расхода';
    document.querySelectorAll('[data-screen]').forEach(section => { section.hidden = section.dataset.screen !== (page === 'archive' ? 'expenses' : page); });
    document.querySelectorAll('[data-page-choice]').forEach(button => { const active = button.dataset.pageChoice === page; button.classList.toggle('active',active); if(active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
    $('#createExpense').hidden = page === 'history' || page === 'archive';
    if (page === 'archive') { ui.query = ''; $('#tableSearch').value = ''; }
    render();
  }
  function syncTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    $('#themeLabel').textContent = dark ? 'Светлая тема' : 'Тёмная тема';
    $('#themeSwitch').setAttribute('aria-label', dark ? 'Светлая тема' : 'Тёмная тема');
    $('#themeSwitch [data-icon]').innerHTML = svgIcon(dark ? 'sun' : 'moon');
  }
  function syncConnection() {
    const original = $('#syncStatus'), visible = $('#visibleSync'), text = original.textContent;
    visible.classList.toggle('online',original.classList.contains('is-online')); visible.classList.toggle('offline',original.classList.contains('is-error'));
    visible.querySelector('span').textContent = original.classList.contains('is-error') ? 'Нет связи с сервером' : text === 'Локально' ? 'На этом устройстве' : text === 'Синхронизация' ? 'Синхронизация' : 'Синхронизировано';
    visible.title = original.classList.contains('is-error') ? 'Изменения сохраняются на устройстве. Проверьте подключение к серверу.' : text;
  }
  function paymentMode(newChoice = false) {
    const full = form.elements.paymentMode.value === 'full';
    $('#splitPayment').hidden = full;
    if(full) form.elements.firstPercent.value = 100;
    else if(newChoice && Number(form.elements.firstPercent.value) === 100) form.elements.firstPercent.value = 50;
    const cost = Number(form.elements.total.value) || 0, percent = Number(form.elements.firstPercent.value) || 0;
    $('#paymentPreview').textContent = 'Первый платёж: ' + amount(cost*percent/100) + '. Второй: ' + amount(cost*(100-percent)/100) + '.';
  }
  function drawerTab(tab) {
    ui.drawerTab = tab;
    document.querySelectorAll('[data-drawer-section]').forEach(section => { section.hidden = section.dataset.drawerSection !== tab; });
    document.querySelectorAll('[data-drawer-tab]').forEach(button => { const selected = button.dataset.drawerTab === tab; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected)); });
  }
  function openRecord(id) {
    snapshot = core.read(); const record = id ? snapshot.expenses.find(item => item.id === id) : null;
    if(id && !record) { showToast('Расход не найден'); return; }
    returnFocus = document.activeElement; ui.selectedId = record?.id || null; ui.selectedVersion = record?.updatedAt;
    form.reset(); $('#drawerError').textContent = '';
    ['title','contractor','total','date','note','paid'].forEach(key => { form.elements[key].value = record ? record[key] : key === 'date' ? today : key === 'paid' ? 0 : ''; });
    form.elements.firstPercent.value = record?.firstPercent ?? 100;
    form.elements.paymentMode.value = record && record.firstPercent !== 100 ? 'split' : 'full';
    $('#drawerKicker').textContent = record ? record.contractor : 'Новый расход'; $('#drawerTitle').textContent = record?.title || 'Добавить расход';
    $('#saveRecord').textContent = record ? 'Сохранить' : 'Создать расход';
    $('#drawerTabs').hidden = !record; $('#recordOverview').hidden = !record; $('#recordActions').hidden = !record;
    if(record) {
      $('#recordOverview').innerHTML = `<div class="record-price"><strong>${amount(record.total)}</strong>${statusMarkup(record)}</div><dl><div><dt>Внесено</dt><dd>${amount(record.calculated.collected)}</dd></div><div><dt>Оплачено</dt><dd>${amount(record.paid)}</dd></div><div><dt>Ещё оплатить</dt><dd>${amount(Math.max(0,record.total-record.paid))}</dd></div></dl><p>${record.firstPercent === 100 ? 'Оплата всей суммы сразу' : 'Первый платёж '+amount(record.calculated.firstPayment)+' ('+record.firstPercent+'%). Второй '+amount(record.calculated.secondPayment)+'.'}</p>`;
      $('#archiveRecord').textContent = record.archivedAt ? 'Вернуть в расходы' : 'В архив';
      $('#toggleRecordClosed').hidden = record.status !== 'closed' && record.displayStatus.key === 'closed'; $('#toggleRecordClosed').textContent = record.status === 'closed' ? 'Открыть расход' : 'Закрыть расход';
    }
    $('#memberInputs').innerHTML = snapshot.users.map((user,index) => `<label class="member-input"><span><i class="member-avatar color-${index%3}">${esc(user.name.slice(0,1))}</i>${esc(user.name)}</span><span class="amount-input"><input type="number" min="0" step="0.01" value="${record?.contributions[user.id] || 0}" data-contribution="${esc(user.id)}" aria-label="Взнос ${esc(user.name)}, USDT"><small>USDT</small></span></label>`).join('');
    paymentMode(); drawerTab(record ? 'payments' : 'details'); dialog.showModal();
    if(record) form.elements.paid.focus(); else form.elements.title.focus();
  }
  function closeDrawer() { dialog.close(); if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true}); }
  function formData() {
    return Object.fromEntries(['title','contractor','total','date','note','paid','firstPercent'].map(key => [key,form.elements[key].value]).concat([['contributions',Object.fromEntries([...form.querySelectorAll('[data-contribution]')].map(input => [input.dataset.contribution,input.value]))]]));
  }
  $('#currentDate').textContent = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Kyiv'}).format(new Date());
  document.addEventListener('click',event => {
    const open = event.target.closest('[data-open]'); if(open) openRecord(open.dataset.open);
    const nav = event.target.closest('[data-page-choice], [data-navigate]'); if(nav) navigate(nav.dataset.pageChoice || nav.dataset.navigate);
    const sorting = event.target.closest('[data-sort]'); if(sorting) { ui.direction = ui.sort === sorting.dataset.sort ? -ui.direction : (sorting.dataset.sort === 'title' ? 1 : -1); ui.sort = sorting.dataset.sort; renderExpenses(); }
    const status = event.target.closest('button[data-status]'); if(status) { ui.status = status.dataset.status; document.querySelectorAll('button[data-status]').forEach(button => { button.classList.toggle('selected',button === status); button.setAttribute('aria-pressed',String(button === status)); }); renderExpenses(); }
    const tab = event.target.closest('[data-drawer-tab]'); if(tab) drawerTab(tab.dataset.drawerTab);
    const exporting = event.target.closest('[data-export]'); if(exporting) { if(exporting.dataset.export === 'csv') core.exportCsv(); else core.exportJson(); $('.export-menu').open = false; showToast(exporting.dataset.export === 'csv' ? 'Таблица скачана' : 'Резервная копия скачана'); }
  });
  $('#periodSelect').addEventListener('change',event => { ui.period = event.target.value; render(); });
  $('#tableSearch').addEventListener('input',event => { ui.query = event.target.value.trim().toLocaleLowerCase('ru-RU'); renderExpenses(); });
  $('#createExpense').addEventListener('click',() => openRecord());
  $('#closeDrawer').addEventListener('click',closeDrawer); $('#cancelDrawer').addEventListener('click',closeDrawer);
  dialog.addEventListener('cancel',() => { if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true}); });
  form.addEventListener('input',event => { if(['paymentMode','total','firstPercent'].includes(event.target.name)) paymentMode(event.target.name === 'paymentMode'); });
  form.addEventListener('invalid',event => { if(event.target.closest('[data-drawer-section="details"]')?.hidden) drawerTab('details'); },true);
  form.addEventListener('submit',event => {
    event.preventDefault();
    try { const id = ui.selectedId, fields = formData(); if(id) core.update(id,fields,ui.selectedVersion); else core.create(fields); closeDrawer(); if(!id) { ui.query=''; $('#tableSearch').value=''; ui.period='all'; $('#periodSelect').value='all'; ui.status='active'; document.querySelector('button[data-status="active"]').click(); navigate('expenses'); } showToast(id ? 'Изменения сохранены' : 'Расход добавлен'); }
    catch(error) { $('#drawerError').textContent = error.message; }
  });
  $('#archiveRecord').addEventListener('click',() => { try { const restoring = Boolean(snapshot.expenses.find(record => record.id === ui.selectedId)?.archivedAt); core.archive(ui.selectedId,ui.selectedVersion); closeDrawer(); showToast(restoring ? 'Расход возвращён из архива' : 'Расход в архиве'); } catch(error) { $('#drawerError').textContent = error.message; } });
  $('#toggleRecordClosed').addEventListener('click',() => { try { const reopening = snapshot.expenses.find(record => record.id === ui.selectedId)?.status === 'closed'; core.toggleClosed(ui.selectedId,ui.selectedVersion); closeDrawer(); showToast(reopening ? 'Расход открыт' : 'Расход закрыт'); } catch(error) { $('#drawerError').textContent = error.message; } });
  $('#themeSwitch').addEventListener('click',() => { core.theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); syncTheme(); });
  $('#appLogout').addEventListener('click',() => core.logout());
  new MutationObserver(syncConnection).observe($('#syncStatus'),{childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('bmf:change',render);
  syncTheme(); syncConnection(); render();
};
