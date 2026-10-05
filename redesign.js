// Presentation layer. Financial logic remains in the encrypted payload.
window.BMF_REDESIGN = { html: `<div id="appShell" class="app-shell">
<aside class="sidebar"><div class="brand"><p class="brand-kicker">Рабочее пространство</p><h1>Forge CRM</h1></div><p class="nav-caption">Финансы студии</p><nav aria-label="Основные разделы"><button class="nav-button is-active" data-view="expenses" type="button" aria-current="page"><span aria-hidden="true">▤</span> Расходы</button><button class="nav-button" data-view="contributions" type="button"><span aria-hidden="true">◷</span> Взносы</button><button class="nav-button" data-view="activity" type="button"><span aria-hidden="true">↺</span> История</button></nav><div class="sidebar-bottom"><div id="syncStatus" class="sync-status" title="Статус синхронизации">Локально</div><div class="theme-toggle" aria-label="Тема интерфейса"><button class="theme-button" type="button" data-theme-choice="light">Светлая</button><button class="theme-button" type="button" data-theme-choice="dark">Тёмная</button></div><button id="logoutButton" class="logout-button" type="button">Выйти ↗</button></div></aside>
<main class="workspace"><header class="topbar"><p>Студия <span aria-hidden="true">/</span> Финансы</p><div class="date-chip"><span>Сегодня</span><strong id="todayLabel"></strong></div></header><div class="page-heading"><div><p class="eyebrow">Управление бюджетом</p><h2 id="pageTitle">Расходы</h2><p id="pageDescription">Планируйте платежи, собирайте взносы и следите за остатком.</p></div><button id="newExpenseButton" class="primary-button" type="button">＋ Добавить расход</button></div>
<div data-page="expenses"><section class="metrics" aria-label="Сводка">
      <article class="metric">
        <span>Сумма расходов</span>
        <strong id="metricTotal">0 USDT</strong>
      </article>
      <article class="metric">
        <span>Взносы участников</span>
        <strong id="metricCollected">0 USDT</strong>
      </article>
      <article class="metric">
        <span>Оплачено</span>
        <strong id="metricPaid">0 USDT</strong>
      </article>
      <article class="metric metric-balance">
        <span>Остаток средств</span>
        <strong id="metricBalance">0 USDT</strong>
        <small id="metricBalanceNote">взносы − оплаты</small>
      </article>
    </section><section class="panel ledger-panel" aria-labelledby="ledger-title">
      <div class="section-head ledger-head">
        <div>
          
          <h2 id="ledger-title">Расходы</h2>
        </div>
        <span class="section-hint">Откройте расход, чтобы внести оплату или взнос</span>
      </div>

      <div class="ledger-tools">
        <div class="filter-tabs" aria-label="Фильтр расходов">
          <button class="filter-button is-active" type="button" data-filter="active">Активные</button>
          <button class="filter-button" type="button" data-filter="all">Все расходы</button>
          <button class="filter-button" type="button" data-filter="closed">Закрытые</button>
          <button class="filter-button" type="button" data-filter="archive">Архив</button>
        </div>
        <label class="search-field"><span>Поиск</span><input id="searchInput" class="search-input" type="search" placeholder="Название или подрядчик" /></label>
        <label class="month-field"><span>Месяц</span><input id="monthFilter" class="month-input" type="month" /></label><button id="resetFilters" class="ghost-button" type="button">Сбросить</button>
      </div>

      <div id="expenseList" class="expense-list"></div>
      <div id="emptyState" class="empty-state" hidden>
        <strong>Ничего не найдено</strong>
        <span>Попробуйте другой запрос, сбросьте фильтры или добавьте расход.</span>
      </div>
    </section></div><div data-page="contributions" hidden><section class="panel contributor-summary" aria-labelledby="contributions-title">
      <div class="section-head summary-head">
        <div>
          <p class="eyebrow">Включая закрытые и архивные расходы</p>
          <h2 id="contributions-title">Взносы участников</h2>
        </div>
        <div class="summary-actions">
          <button id="exportCsvButton" class="ghost-button compact-button" type="button">Скачать CSV</button>
          <button id="exportJsonButton" class="ghost-button compact-button" type="button">Резервная копия</button>
        </div>
      </div>
      <div id="contributorTotals" class="contributor-totals"></div>
    </section><div class="help-note"><strong>Как считаются взносы</strong><p>Здесь показана сумма взносов каждого участника за всё время, включая архив. Чтобы изменить взнос, откройте нужный расход в разделе «Расходы».</p></div></div><div data-page="activity" hidden><section class="panel activity-panel" aria-labelledby="activity-title">
      <div class="section-head">
        <div>
          
          <h2 id="activity-title">История изменений</h2>
        </div>
        <button id="toggleActivityButton" class="ghost-button compact-button" type="button" aria-expanded="true">Скрыть</button>
      </div>
      <div id="activityBody" class="activity-body">
        <div id="activityList" class="activity-list"></div>
        <div id="activityEmpty" class="empty-state compact-empty" hidden>
          <strong>История пока пустая</strong>
          <span>Действия появятся после новых изменений.</span>
        </div>
      </div>
    </section></div><footer class="workspace-footer">Все суммы в USDT <span>Записи сохраняются после изменения поля</span></footer></main></div><dialog id="expenseDialog" aria-labelledby="new-expense-title"><div class="dialog-inner">
      <div class="section-head">
        <div>
          <p class="eyebrow">Расходы студии</p>
          <h2 id="new-expense-title">Добавить расход</h2>
        </div><button id="closeExpenseDialog" class="ghost-button" type="button" aria-label="Закрыть форму">✕</button>
      </div>

      <form id="expenseForm" class="expense-form">
        <label class="field field-date">
          Дата
          <input name="date" type="date" required />
        </label>
        <label class="field field-contractor">
          Кому платим
          <input name="contractor" type="text" placeholder="Имя или название компании" required />
        </label>
        <label class="field field-title">
          За что
          <input name="title" type="text" placeholder="Например, разработка сайта" required />
        </label>
        <label class="field field-total">
          Сумма, USDT
          <input name="total" type="number" min="0" step="1" placeholder="600" required />
        </label>
        <label class="field field-percent">
          Первый платёж, %
          <input name="firstPercent" type="number" min="0" max="100" step="1" value="50" required />
        </label>
        <label class="field field-note">
          Комментарий
          <input name="note" type="text" placeholder="Условия оплаты или важные детали" />
        </label>
        <button class="primary-button submit-expense" type="submit">Создать расход</button><button id="cancelExpenseDialog" class="ghost-button" type="button">Отмена</button>
      </form>
    </div></dialog><div id="toastRegion" class="toast-region" aria-live="polite"></div><template id="expenseTemplate">
  <article class="expense-card"><details class="expense-details">
    <summary class="expense-main">
      <div>
        <div class="expense-date"></div>
        <h3></h3>
        <p class="expense-contractor"></p>
      </div>
      <div class="expense-side">
        <span class="status-badge"></span>
        <div class="expense-total">
          <span>Сумма</span>
          <strong></strong>
        </div>
      </div>
    </summary><div class="expense-detail-body"><div class="payment-mode"></div>
    <div class="edit-area" hidden></div>

    <div class="payment-grid">
      <div>
        <span>Первый платёж</span>
        <strong class="first-payment"></strong>
      </div>
      <div>
        <span>Второй платёж</span>
        <strong class="second-payment"></strong>
      </div>
      <label>
        Оплачено подрядчику
        <input class="paid-input" type="number" min="0" step="1" />
      </label>
    </div>

    <div class="progress-block">
      <div class="progress-label">
        <span>Сбор на первый платёж</span>
        <strong class="first-status"></strong>
      </div>
      <div class="progress-track"><div class="progress-fill first-fill"></div></div>
      <div class="progress-label">
        <span>Сбор на всю сумму</span>
        <strong class="full-status"></strong>
      </div>
      <div class="progress-track"><div class="progress-fill full-fill"></div></div>
    </div>

    <div class="suggestion-block">
      <div>
        <span>Покрытие расхода</span>
        <strong class="suggestion-title"></strong>
      </div>
      <div class="suggestion-list"></div>
    </div>

    <div class="contribution-heading"><h4>Взносы на этот расход</h4><p>Укажите общую сумму, которую внёс каждый участник.</p></div><div class="contribution-grid"></div>

    <div class="expense-footer">
      <p class="expense-note"></p>
      <div class="expense-actions">
        <button class="ghost-button edit-button" type="button">Редактировать</button>
        <button class="ghost-button close-button" type="button">Закрыть</button>
        <button class="delete-button archive-button" type="button">В архив</button>
      </div>
    </div>
  </div></details></article>
</template>` };
