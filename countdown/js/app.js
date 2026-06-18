(() => {
  'use strict';

  const STORAGE_KEY = 'countdown_events';
  const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const isFileMode = window.location.protocol === 'file:';

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
  const fileMenuToggle = document.getElementById('file-menu-toggle');
  const fileMenu       = document.getElementById('file-menu');
  const backupBtn      = document.getElementById('backup-btn');
  const restoreBtn     = document.getElementById('restore-btn');
  const restoreInput   = document.getElementById('restore-input');
  const fileToolsStatus = document.getElementById('file-tools-status');

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

  const restoreChoiceOverlay      = document.getElementById('restore-choice-overlay');
  const restoreChoiceDialog       = restoreChoiceOverlay.querySelector('.modal');
  const restoreChoiceCancelBtn    = document.getElementById('restore-choice-cancel-btn');
  const restoreChoiceMergeBtn     = document.getElementById('restore-choice-merge-btn');
  const restoreChoiceOverwriteBtn = document.getElementById('restore-choice-overwrite-btn');

  const mergeSummaryOverlay = document.getElementById('merge-summary-overlay');
  const mergeSummaryDialog  = mergeSummaryOverlay.querySelector('.modal');
  const mergeSummaryTitle   = document.getElementById('merge-summary-title');
  const mergeSummaryMsg     = document.getElementById('merge-summary-msg');
  const mergeSummaryOkBtn   = document.getElementById('merge-summary-ok-btn');

  let lastFocusedElement = null;
  let restoreChoiceResolver = null;

  function getMenuItems() {
    if (!fileMenu) return [];
    return Array.from(fileMenu.querySelectorAll('[role="menuitem"]'));
  }

  function focusMenuItem(index) {
    const items = getMenuItems();
    if (!items.length) return;
    const safeIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((item, itemIndex) => {
      item.tabIndex = itemIndex === safeIndex ? 0 : -1;
    });
    items[safeIndex].focus();
  }

  function focusFirstMenuItem() {
    focusMenuItem(0);
  }

  function focusLastMenuItem() {
    const items = getMenuItems();
    focusMenuItem(items.length - 1);
  }

  function focusNextMenuItem() {
    const items = getMenuItems();
    if (!items.length) return;
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));
    const nextIndex = (currentIndex + 1) % items.length;
    focusMenuItem(nextIndex);
  }

  function focusPreviousMenuItem() {
    const items = getMenuItems();
    if (!items.length) return;
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    focusMenuItem(prevIndex);
  }

  function setBackgroundInert(isInert) {
    if (!appRoot) return;
    appRoot.toggleAttribute('inert', isInert);
    appRoot.setAttribute('aria-hidden', isInert ? 'true' : 'false');
  }

  function getOpenOverlay() {
    if (mergeSummaryOverlay.classList.contains('open')) return mergeSummaryOverlay;
    if (restoreChoiceOverlay.classList.contains('open')) return restoreChoiceOverlay;
    if (confirmOverlay.classList.contains('open')) return confirmOverlay;
    if (modalOverlay.classList.contains('open')) return modalOverlay;
    return null;
  }

  function hasOpenDialog() {
    return !!getOpenOverlay();
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
    modalOverlay.hidden = false;
    modalOverlay.classList.add('open');
    setTimeout(() => eventNameInput.focus(), 50);
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    modalOverlay.hidden = true;
    if (!hasOpenDialog()) {
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
    confirmOverlay.hidden = false;
    confirmOverlay.classList.add('open');
    setTimeout(() => confirmDeleteBtn.focus(), 50);
  }

  function closeConfirm() {
    confirmOverlay.classList.remove('open');
    confirmOverlay.hidden = true;
    if (!hasOpenDialog()) {
      setBackgroundInert(false);
    }
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function openRestoreChoice() {
    lastFocusedElement = document.activeElement;
    setBackgroundInert(true);
    restoreChoiceOverlay.hidden = false;
    restoreChoiceOverlay.classList.add('open');
    setTimeout(() => restoreChoiceMergeBtn.focus(), 50);
  }

  function closeRestoreChoice() {
    restoreChoiceOverlay.classList.remove('open');
    restoreChoiceOverlay.hidden = true;
    if (!hasOpenDialog()) {
      setBackgroundInert(false);
    }
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function resolveRestoreChoice(mode) {
    if (typeof restoreChoiceResolver === 'function') {
      restoreChoiceResolver(mode);
      restoreChoiceResolver = null;
    }
    closeRestoreChoice();
  }

  function openRestoreResult(title, messageHtml) {
    lastFocusedElement = document.activeElement;
    setBackgroundInert(true);
    if (mergeSummaryTitle) {
      mergeSummaryTitle.textContent = title;
    }
    mergeSummaryMsg.innerHTML = messageHtml;
    mergeSummaryOverlay.hidden = false;
    mergeSummaryOverlay.classList.add('open');
    setTimeout(() => mergeSummaryOkBtn.focus(), 50);
  }

  function closeMergeSummary() {
    mergeSummaryOverlay.classList.remove('open');
    mergeSummaryOverlay.hidden = true;
    if (!hasOpenDialog()) {
      setBackgroundInert(false);
    }
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function pickRestoreMode() {
    return new Promise(resolve => {
      restoreChoiceResolver = resolve;
      openRestoreChoice();
    });
  }

  function setFileToolsStatus(message, isError = false) {
    if (!fileToolsStatus) return;
    fileToolsStatus.textContent = message;
    fileToolsStatus.classList.toggle('error', isError);
  }

  function isFileMenuOpen() {
    return !!fileMenu && !fileMenu.hidden;
  }

  function positionFileMenu() {
    if (!fileMenu || !fileMenuToggle) return;

    const rect = fileMenuToggle.getBoundingClientRect();
    const gap = 10;
    const menuWidth = Math.min(290, Math.round(window.innerWidth * 0.9));

    let left = rect.right - menuWidth;
    left = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10));

    const top = Math.min(rect.bottom + gap, window.innerHeight - 80);

    fileMenu.style.left = `${left}px`;
    fileMenu.style.top = `${top}px`;
  }

  function setFileMenuOpen(isOpen) {
    if (!fileMenu || !fileMenuToggle) return;
    fileMenu.hidden = !isOpen;
    fileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
      const items = getMenuItems();
      items.forEach((item, index) => {
        item.tabIndex = index === 0 ? 0 : -1;
      });
      positionFileMenu();
    } else {
      const items = getMenuItems();
      items.forEach(item => {
        item.tabIndex = -1;
      });
    }
  }

  function createBackupFilename() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `countdown-backup-${yyyy}-${mm}-${dd}.json`;
  }

  function backupToFile() {
    const payload = {
      app: 'countdown',
      version: 1,
      exportedAt: new Date().toISOString(),
      events: loadEvents()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = createBackupFilename();
    link.click();
    URL.revokeObjectURL(link.href);
    setFileToolsStatus('Backup saved.');
    setFileMenuOpen(false);
  }

  function sanitizeImportedEvents(raw) {
    if (!Array.isArray(raw)) return [];

    return raw
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        const targetMs = Number(item.targetMs);
        if (!name || !Number.isFinite(targetMs)) return null;

        return {
          id: typeof item.id === 'string' && item.id.trim() ? item.id : generateId(),
          name,
          targetMs
        };
      })
      .filter(Boolean);
  }

  function extractImportedEvents(parsedData) {
    if (Array.isArray(parsedData)) return sanitizeImportedEvents(parsedData);
    if (parsedData && typeof parsedData === 'object') {
      return sanitizeImportedEvents(parsedData.events);
    }
    return [];
  }

  function getEventIdentityKey(eventItem) {
    const normalizedName = String(eventItem.name || '').trim().toLowerCase();
    const normalizedTargetMs = Number(eventItem.targetMs);
    return `${normalizedName}|${normalizedTargetMs}`;
  }

  function dedupeEventsIgnoreId(events) {
    const seenKeys = new Set();
    const deduped = [];

    events.forEach(item => {
      const key = getEventIdentityKey(item);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      deduped.push(item);
    });

    return deduped;
  }

  function mergeEventsIgnoreId(existingEvents, importedEvents) {
    const baseEvents = dedupeEventsIgnoreId(existingEvents);
    const merged = baseEvents.slice();
    const existingIds = new Set(merged.map(item => item.id));
    const existingKeys = new Set(merged.map(item => getEventIdentityKey(item)));

    let addedCount = 0;
    let skippedDuplicateCount = 0;

    dedupeEventsIgnoreId(importedEvents).forEach(item => {
      const key = getEventIdentityKey(item);
      if (existingKeys.has(key)) {
        skippedDuplicateCount += 1;
        return;
      }

      const mergedItem = { ...item };
      if (!mergedItem.id || existingIds.has(mergedItem.id)) {
        mergedItem.id = generateId();
      }

      merged.push(mergedItem);
      existingIds.add(mergedItem.id);
      existingKeys.add(key);
      addedCount += 1;
    });

    return {
      merged,
      addedCount,
      skippedDuplicateCount
    };
  }

  function promptRestoreFromFile() {
    if (!restoreInput) return;
    restoreInput.value = '';
    restoreInput.click();
    setFileMenuOpen(false);
  }

  function handleRestoreFileChange(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async loadEvent => {
      try {
        const parsed = JSON.parse(loadEvent.target.result);
        const importedEvents = extractImportedEvents(parsed);

        if (importedEvents.length === 0) {
          setFileToolsStatus('Restore failed: no valid countdown events found.', true);
          openRestoreResult('Restore Failed', 'No valid countdown events were found in the selected file.');
          return;
        }

        const currentEvents = loadEvents();
        const mode = await pickRestoreMode();

        if (mode === null) {
          setFileToolsStatus('Restore canceled.');
          return;
        }

        if (mode === 'overwrite') {
          const dedupedImport = dedupeEventsIgnoreId(importedEvents);
          saveEvents(dedupedImport);
          renderAll();
          startTick();
          setFileToolsStatus(`Restore complete: ${dedupedImport.length} event(s) loaded (overwrite).`);
          openRestoreResult('Restore Complete', `Total items in file: <strong>${importedEvents.length}</strong><br>Items loaded (overwrite): <strong>${dedupedImport.length}</strong>`);
          return;
        }

        const mergeResult = mergeEventsIgnoreId(currentEvents, importedEvents);
        saveEvents(mergeResult.merged);
        renderAll();
        startTick();
        setFileToolsStatus(
          `Merge complete: ${mergeResult.addedCount} added, ${mergeResult.skippedDuplicateCount} duplicate(s) skipped.`
        );
        openRestoreResult(
          'Merge Summary',
          `Total items in file: <strong>${importedEvents.length}</strong><br>Items added: <strong>${mergeResult.addedCount}</strong><br>Items skipped: <strong>${mergeResult.skippedDuplicateCount}</strong>`
        );
      } catch {
        setFileToolsStatus('Restore failed: invalid JSON file.', true);
        openRestoreResult('Restore Failed', 'The selected file is not valid JSON.');
      }
    };

    reader.onerror = () => {
      setFileToolsStatus('Restore failed: unable to read file.', true);
      openRestoreResult('Restore Failed', 'Unable to read the selected file.');
    };

    reader.readAsText(file);
  }

  function initFileTools() {
    if (!fileMenuToggle || !fileMenu || !backupBtn || !restoreBtn || !restoreInput) return;

    if (!isFileMode) {
      fileMenuToggle.hidden = true;
      fileMenu.hidden = true;
      return;
    }

    fileMenuToggle.hidden = false;
    setFileMenuOpen(false);

    fileMenuToggle.addEventListener('click', () => {
      setFileMenuOpen(!isFileMenuOpen());
    });

    fileMenuToggle.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!isFileMenuOpen()) setFileMenuOpen(true);
        focusFirstMenuItem();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isFileMenuOpen()) setFileMenuOpen(true);
        focusLastMenuItem();
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!isFileMenuOpen()) {
          setFileMenuOpen(true);
          focusFirstMenuItem();
        } else {
          setFileMenuOpen(false);
        }
      }
    });

    fileMenu.addEventListener('keydown', event => {
      if (!isFileMenuOpen()) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusNextMenuItem();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusPreviousMenuItem();
      }
      if (event.key === 'Home') {
        event.preventDefault();
        focusFirstMenuItem();
      }
      if (event.key === 'End') {
        event.preventDefault();
        focusLastMenuItem();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setFileMenuOpen(false);
        fileMenuToggle.focus();
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        if (event.shiftKey) {
          focusPreviousMenuItem();
        } else {
          focusNextMenuItem();
        }
      }
    });

    backupBtn.addEventListener('click', backupToFile);
    restoreBtn.addEventListener('click', promptRestoreFromFile);
    restoreInput.addEventListener('change', handleRestoreFileChange);
    setFileToolsStatus('File mode active.');

    document.addEventListener('click', event => {
      if (!isFileMenuOpen()) return;
      const clickInsideToggle = fileMenuToggle.contains(event.target);
      const clickInsideMenu = fileMenu.contains(event.target);
      if (!clickInsideToggle && !clickInsideMenu) {
        setFileMenuOpen(false);
      }
    });

    window.addEventListener('resize', () => {
      if (isFileMenuOpen()) {
        positionFileMenu();
      }
    });

    window.addEventListener('scroll', () => {
      if (isFileMenuOpen()) {
        positionFileMenu();
      }
    }, { passive: true });
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

  restoreChoiceOverlay.addEventListener('click', e => {
    if (e.target === restoreChoiceOverlay) {
      resolveRestoreChoice(null);
    }
  });

  restoreChoiceCancelBtn.addEventListener('click', () => resolveRestoreChoice(null));
  restoreChoiceMergeBtn.addEventListener('click', () => resolveRestoreChoice('merge'));
  restoreChoiceOverwriteBtn.addEventListener('click', () => resolveRestoreChoice('overwrite'));

  mergeSummaryOverlay.addEventListener('click', e => {
    if (e.target === mergeSummaryOverlay) {
      closeMergeSummary();
    }
  });

  mergeSummaryOkBtn.addEventListener('click', closeMergeSummary);

  // Keyboard: Escape closes open modals
  document.addEventListener('keydown', e => {
    trapFocusInOpenDialog(e);
    if (e.key === 'Escape' && isFileMenuOpen()) {
      setFileMenuOpen(false);
      return;
    }
    if (e.key !== 'Escape') return;
    if (mergeSummaryOverlay.classList.contains('open')) { closeMergeSummary(); return; }
    if (restoreChoiceOverlay.classList.contains('open')) { resolveRestoreChoice(null); return; }
    if (modalOverlay.classList.contains('open'))  closeModal();
    if (confirmOverlay.classList.contains('open')) { pendingDeleteId = null; closeConfirm(); }
  });

  // ── Init ─────────────────────────────────────────────────────

  initFileTools();
  renderAll();
  startTick();
})();
