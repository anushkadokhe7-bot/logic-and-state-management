(function () {
  'use strict';

  const STORAGE_KEY = 'ledger.tasks.v1';

  // ---- State ----
  let tasks = loadTasks();
  let currentFilter = 'all';

  // ---- Persistence ----
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Could not load saved tasks, starting fresh.', err);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn('Could not save tasks (storage may be full or disabled).', err);
    }
  }

  // ---- DOM refs ----
  const listEl = document.getElementById('task-list');
  const inputEl = document.getElementById('task-input');
  const addBtn = document.getElementById('add-btn');
  const filtersEl = document.getElementById('filters');
  const tallyEl = document.getElementById('tally');
  const footerCountEl = document.getElementById('footer-count');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const toastEl = document.getElementById('toast');
  const toastMessageEl = document.getElementById('toast-message');
  const toastUndoBtn = document.getElementById('toast-undo');

  const LINGER_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

  // ---- Undo (backs both single delete and clear-completed) ----
  let pendingUndo = null; // { items: [{ task, index }] }
  let toastTimer = null;

  function showToast(message, undoItems) {
    pendingUndo = { items: undoItems };
    toastMessageEl.textContent = message;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    toastEl.classList.remove('visible');
    pendingUndo = null;
  }

  function undoLast() {
    if (!pendingUndo) return;
    // reinsert in ascending index order so positions land correctly
    const items = [...pendingUndo.items].sort((a, b) => a.index - b.index);
    items.forEach(({ task, index }) => {
      const safeIndex = Math.min(index, tasks.length);
      tasks.splice(safeIndex, 0, task);
    });
    clearTimeout(toastTimer);
    hideToast();
    saveTasks();
    render();
  }

  toastUndoBtn.addEventListener('click', undoLast);

  // ---- CRUD ----
  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    tasks.push({
      id: Date.now() + Math.random().toString(16).slice(2),
      text: trimmed,
      completed: false,
      createdAt: Date.now()
    });
    saveTasks();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) task.completed = !task.completed;
    saveTasks();
    render();
  }

  function editTask(id, newText) {
    const trimmed = newText.trim();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (trimmed) {
      task.text = trimmed;
    } else {
      // empty edit deletes the task
      tasks = tasks.filter(t => t.id !== id);
    }
    saveTasks();
    render();
  }

  function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;
    const [removed] = tasks.splice(index, 1);
    saveTasks();
    render();
    showToast('Task deleted.', [{ task: removed, index }]);
  }

  function clearCompleted() {
    const removedItems = [];
    tasks = tasks.filter((t, i) => {
      if (t.completed) {
        removedItems.push({ task: t, index: i });
        return false;
      }
      return true;
    });
    saveTasks();
    render();
    if (removedItems.length > 0) {
      const label = removedItems.length === 1 ? 'task' : 'tasks';
      showToast(`Cleared ${removedItems.length} completed ${label}.`, removedItems);
    }
  }

  // ---- Filtering ----
  function getVisibleTasks() {
    if (currentFilter === 'active') return tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
  }

  function setFilter(filter) {
    currentFilter = filter;
    render();
  }

  // ---- Rendering ----
  function formatAge(createdAt) {
    if (!createdAt) return '';
    const ms = Date.now() - createdAt;
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  function render() {
    // filter buttons
    [...filtersEl.children].forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });

    const visible = getVisibleTasks();
    listEl.innerHTML = '';

    if (visible.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = tasks.length === 0
        ? 'Nothing on the ledger yet.'
        : `No ${currentFilter} tasks.`;
      listEl.appendChild(empty);
    } else {
      const frag = document.createDocumentFragment();
      visible.forEach(task => frag.appendChild(buildTaskEl(task)));
      listEl.appendChild(frag);
    }

    const openCount = tasks.filter(t => !t.completed).length;
    tallyEl.innerHTML = `<strong>${openCount}</strong> open`;
    footerCountEl.textContent = `${tasks.length} total · ${tasks.length - openCount} completed`;
  }

  function buildTaskEl(task) {
    const li = document.createElement('li');
    const isLingering = !task.completed &&
      task.createdAt && (Date.now() - task.createdAt) > LINGER_THRESHOLD_MS;
    li.className = 'task' +
      (task.completed ? ' completed' : '') +
      (isLingering ? ' lingering' : '');
    li.dataset.id = task.id;

    const check = document.createElement('span');
    check.className = 'check';
    check.dataset.action = 'toggle';
    check.textContent = task.completed ? '✓' : '';

    const text = document.createElement('span');
    text.className = 'task-text';
    text.dataset.action = 'edit-target';
    text.textContent = task.text; // textContent, never innerHTML — avoids XSS

    const age = document.createElement('span');
    age.className = 'task-age';
    age.textContent = formatAge(task.createdAt);
    age.title = isLingering ? 'This one\u2019s been on the ledger a while.' : '';

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.dataset.action = 'delete';
    del.setAttribute('aria-label', 'Delete task');
    del.textContent = '×';

    li.append(check, text, age, del);
    return li;
  }

  // ---- Event delegation ----
  // One listener on the list container handles clicks for every task,
  // present or future — no per-item listeners to attach or leak.
  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('.task');
    if (!li) return;
    const id = li.dataset.id;
    const action = e.target.dataset.action;

    if (action === 'toggle') {
      toggleTask(id);
    } else if (action === 'delete') {
      deleteTask(id);
    } else if (action === 'edit-target') {
      startEditing(e.target, id);
    }
  });

  function startEditing(span, id) {
    span.contentEditable = 'true';
    span.focus();
    // place cursor at end
    const range = document.createRange();
    range.selectNodeContents(span);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function finish() {
      span.contentEditable = 'false';
      span.removeEventListener('blur', finish);
      span.removeEventListener('keydown', onKey);
      editTask(id, span.textContent);
    }
    function onKey(ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); span.blur(); }
      if (ev.key === 'Escape') {
        span.textContent = tasks.find(t => t.id === id).text;
        span.blur();
      }
    }
    span.addEventListener('blur', finish);
    span.addEventListener('keydown', onKey);
  }

  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    setFilter(btn.dataset.filter);
  });

  addBtn.addEventListener('click', () => {
    addTask(inputEl.value);
    inputEl.value = '';
    inputEl.focus();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTask(inputEl.value);
      inputEl.value = '';
    }
  });

  clearCompletedBtn.addEventListener('click', clearCompleted);

  // ---- Init ----
  render();
})();
