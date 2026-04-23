(() => {
  'use strict';

  const STORAGE_KEY = 'countdown_events';
  const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // ── Helpers ──────────────────────────────────────────────────

  function loadEvents() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Compute the difference between now and a target date,
   * expressed as whole calendar units (years, months, days, hours, minutes).
   */
  function computeDiff(targetMs) {
    const now = new Date();
    const target = new Date(targetMs);
    const isPast = target <= now;

    const from = isPast ? target : now;
    const to   = isPast ? now    : target;

    let years  = to.getFullYear()  - from.getFullYear();
    let months = to.getMonth()     - from.getMonth();
    let days   = to.getDate()      - from.getDate();
    let hours  = to.getHours()     - from.getHours();
    let mins   = to.getMinutes()   - from.getMinutes();

    if (mins < 0)   { mins += 60;  hours -= 1; }
    if (hours < 0)  { hours += 24; days  -= 1; }
    if (days < 0) {
      const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
      days  += prevMonth.getDate();
      months -= 1;
    }
    if (months < 0) { months += 12; years -= 1; }

    return { years, months, days, hours, mins, isPast };
  }

  function formatDateLabel(ms) {
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function getNowForDateTimeLocal() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  function getUrgencyClass(targetMs) {
    const remainingMs = targetMs - Date.now();
    if (remainingMs <= 0) return '';
    if (remainingMs <= 60 * 1000) return 'urgency-minute';
    if (remainingMs <= 60 * 60 * 1000) return 'urgency-hour';
    if (remainingMs <= 24 * 60 * 60 * 1000) return 'urgency-day';
    return '';
  }

  // ── DOM refs ─────────────────────────────────────────────────

  const container      = document.getElementById('timers-container');
  const addBtn         = document.getElementById('add-btn');
  const appRoot        = document.getElementById('app-root');

  const modalOverlay   = document.getElementById('modal-overlay');
  const modalDialog    = modalOverlay.querySelector('.modal');
  const modalTitle     = document.getElementById('modal-title');
  const eventForm      = document.getElementById('event-form');
  const eventIdInput   = document.getElementById('event-id');
  const eventNameInput = document.getElementById('event-name');
  const eventDateInput = document.getElementById('event-date');
  const nameError      = document.getElementById('name-error');
  const dateError      = document.getElementById('date-error');
  const cancelBtn      = document.getElementById('cancel-btn');

  const confirmOverlay    = document.getElementById('confirm-overlay');
  const confirmDialog     = confirmOverlay.querySelector('.modal');
  const confirmMsg        = document.getElementById('confirm-msg');
  const confirmCancelBtn  = document.getElementById('confirm-cancel-btn');
  const confirmDeleteBtn  = document.getElementById('confirm-delete-btn');

  let lastFocusedElement = null;

  function setBackgroundInert(isInert) {
    if (!appRoot) return;
    appRoot.toggleAttribute('inert', isInert);
    appRoot.setAttribute('aria-hidden', isInert ? 'true' : 'false');
  }

  function getOpenOverlay() {
    if (confirmOverlay.classList.contains('open')) return confirmOverlay;
    if (modalOverlay.classList.contains('open')) return modalOverlay;
    return null;
  }

  function trapFocusInOpenDialog(event) {
    if (event.key !== 'Tab') return;
    const openOverlay = getOpenOverlay();
    if (!openOverlay) return;

    const focusable = openOverlay.querySelectorAll(FOCUSABLE_SELECTOR);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;

    if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    }
  }

  // ── Modal helpers ────────────────────────────────────────────

  function openModal() {
    lastFocusedElement = document.activeElement;
    setBackgroundInert(true);
    modalOverlay.classList.add('open');
    setTimeout(() => eventNameInput.focus(), 50);
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    if (!confirmOverlay.classList.contains('open')) {
      setBackgroundInert(false);
    }
    eventForm.reset();
    eventIdInput.value = '';
    nameError.textContent = '';
    dateError.textContent = '';
    eventNameInput.setAttribute('aria-invalid', 'false');
    eventDateInput.setAttribute('aria-invalid', 'false');
    modalTitle.textContent = 'New Countdown';
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function openConfirm(eventName) {
    lastFocusedElement = document.activeElement;
    setBackgroundInert(true);
    confirmMsg.textContent = `Delete "${eventName}"? This cannot be undone.`;
    confirmOverlay.classList.add('open');
    setTimeout(() => confirmDeleteBtn.focus(), 50);
  }

  function closeConfirm() {
    confirmOverlay.classList.remove('open');
    if (!modalOverlay.classList.contains('open')) {
      setBackgroundInert(false);
    }
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  // ── Render ───────────────────────────────────────────────────

  let tickInterval = null;

  function renderAll() {
    const events = loadEvents()
      .slice()
      .sort((a, b) => a.targetMs - b.targetMs); // closest (smallest ms) first

    container.innerHTML = '';

    if (events.length === 0) {
      container.innerHTML = `
        <div id="empty-state">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <p>No countdowns yet — hit <strong>+</strong> to add one!</p>
        </div>`;
      return;
    }

    events.forEach(ev => {
      const card = buildCard(ev);
      container.appendChild(card);
    });
  }

  function buildCard(ev) {
    const { years, months, days, hours, mins, isPast } = computeDiff(ev.targetMs);
    const urgencyClass = getUrgencyClass(ev.targetMs);

    const card = document.createElement('div');
    card.className = `timer-card${isPast ? ' past' : ''}${urgencyClass ? ` ${urgencyClass}` : ''}`;
    card.dataset.id = ev.id;

    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="event-name">
            ${escapeHtml(ev.name)}
            ${isPast ? '<span class="past-badge">Passed</span>' : ''}
          </div>
          <div class="event-date-label">${formatDateLabel(ev.targetMs)}</div>
        </div>
        <div class="card-actions">
          <button class="icon-btn edit-btn" title="Edit" aria-label="Edit ${escapeHtml(ev.name)}">
            <!-- pencil icon -->
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="icon-btn delete-btn" title="Delete" aria-label="Delete ${escapeHtml(ev.name)}">
            <!-- trash icon -->
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="countdown-segments">
        ${segment(years,  'Year',   years)}
        ${segment(months, 'Month',  months)}
        ${segment(days,   'Day',    days)}
        ${segment(hours,  'Hour',   hours)}
        ${segment(mins,   'Min',    mins)}
      </div>`;

    card.querySelector('.edit-btn').addEventListener('click', () => startEdit(ev.id));
    card.querySelector('.delete-btn').addEventListener('click', () => startDelete(ev.id, ev.name));

    return card;
  }

  function segment(value, label, rawValue) {
    const plural = rawValue !== 1 ? 's' : '';
    return `
      <div class="segment">
        <span class="segment-value">${String(value).padStart(2, '0')}</span>
        <span class="segment-label">${label}${plural}</span>
      </div>`;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Live tick ────────────────────────────────────────────────

  function startTick() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(() => {
      // Update only the segment values in-place to avoid full re-render flicker
      document.querySelectorAll('.timer-card').forEach(card => {
        const events = loadEvents();
        const ev = events.find(e => e.id === card.dataset.id);
        if (!ev) return;

        const { years, months, days, hours, mins, isPast } = computeDiff(ev.targetMs);

        const values = [years, months, days, hours, mins];
        card.querySelectorAll('.segment-value').forEach((el, i) => {
          el.textContent = String(values[i]).padStart(2, '0');
        });

        // update plural labels
        const labels  = ['Year', 'Month', 'Day', 'Hour', 'Min'];
        card.querySelectorAll('.segment-label').forEach((el, i) => {
          el.textContent = labels[i] + (values[i] !== 1 ? 's' : '');
        });

        // toggle past class
        card.classList.toggle('past', isPast);

        // update urgency pulse classes
        const urgencyClass = getUrgencyClass(ev.targetMs);
        card.classList.remove('urgency-day', 'urgency-hour', 'urgency-minute');
        if (!isPast && urgencyClass) {
          card.classList.add(urgencyClass);
        }
      });
    }, 1000);
  }

  // ── Add / Edit flow ──────────────────────────────────────────

  function startAdd() {
    modalTitle.textContent = 'New Countdown';
    eventIdInput.value = '';
    eventNameInput.value = '';
    eventDateInput.value = getNowForDateTimeLocal();
    openModal();
  }

  function startEdit(id) {
    const events = loadEvents();
    const ev = events.find(e => e.id === id);
    if (!ev) return;

    modalTitle.textContent = 'Edit Countdown';
    eventIdInput.value = ev.id;
    eventNameInput.value = ev.name;

    // datetime-local expects "YYYY-MM-DDTHH:MM"
    const d = new Date(ev.targetMs);
    const pad = n => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    eventDateInput.value = local;

    openModal();
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    const name = eventNameInput.value.trim();
    const dateVal = eventDateInput.value;

    let valid = true;
    nameError.textContent = '';
    dateError.textContent = '';
    eventNameInput.setAttribute('aria-invalid', 'false');
    eventDateInput.setAttribute('aria-invalid', 'false');

    if (!name) {
      nameError.textContent = 'Please enter an event name.';
      eventNameInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (!dateVal) {
      dateError.textContent = 'Please select a date and time.';
      eventDateInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }

    if (!valid) {
      if (eventNameInput.getAttribute('aria-invalid') === 'true') {
        eventNameInput.focus();
      } else if (eventDateInput.getAttribute('aria-invalid') === 'true') {
        eventDateInput.focus();
      }
      return;
    }

    const targetMs = new Date(dateVal).getTime();
    const events = loadEvents();
    const existingId = eventIdInput.value;

    if (existingId) {
      const idx = events.findIndex(e => e.id === existingId);
      if (idx !== -1) {
        events[idx].name = name;
        events[idx].targetMs = targetMs;
      }
    } else {
      events.push({ id: generateId(), name, targetMs });
    }

    saveEvents(events);
    closeModal();
    renderAll();
    startTick();
  }

  // ── Delete flow ──────────────────────────────────────────────

  let pendingDeleteId = null;

  function startDelete(id, name) {
    pendingDeleteId = id;
    openConfirm(name);
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    const events = loadEvents().filter(e => e.id !== pendingDeleteId);
    saveEvents(events);
    pendingDeleteId = null;
    closeConfirm();
    renderAll();
    startTick();
  }

  // ── Event listeners ──────────────────────────────────────────

  addBtn.addEventListener('click', startAdd);
  cancelBtn.addEventListener('click', closeModal);
  eventForm.addEventListener('submit', handleFormSubmit);

  confirmCancelBtn.addEventListener('click', () => {
    pendingDeleteId = null;
    closeConfirm();
  });
  confirmDeleteBtn.addEventListener('click', confirmDelete);

  // Close modals on overlay click
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });
  confirmOverlay.addEventListener('click', e => {
    if (e.target === confirmOverlay) { pendingDeleteId = null; closeConfirm(); }
  });

  // Keyboard: Escape closes open modals
  document.addEventListener('keydown', e => {
    trapFocusInOpenDialog(e);
    if (e.key !== 'Escape') return;
    if (modalOverlay.classList.contains('open'))  closeModal();
    if (confirmOverlay.classList.contains('open')) { pendingDeleteId = null; closeConfirm(); }
  });

  // ── Init ─────────────────────────────────────────────────────

  renderAll();
  startTick();
})();
