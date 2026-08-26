/* =========================
   STATE
========================= */

let tasks = JSON.parse(localStorage.getItem("ledgerTasks")) || [];

let currentFilter = "all";
let searchQuery = "";
let deletedTask = null;


/* =========================
   DOM ELEMENTS
========================= */

const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");

const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

const searchInput = document.getElementById("searchInput");

const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const completedCount = document.getElementById("completedCount");

const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");

const taskSummary = document.getElementById("taskSummary");

const clearCompletedBtn =
    document.getElementById("clearCompleted");

const undoBtn =
    document.getElementById("undoBtn");

const themeBtn =
    document.getElementById("themeBtn");


/* =========================
   SAVE STATE
========================= */

function saveTasks() {

    localStorage.setItem(
        "ledgerTasks",
        JSON.stringify(tasks)
    );

}


/* =========================
   ADD TASK
========================= */

function addTask() {

    const text = taskInput.value.trim();

    if (!text) {
        taskInput.focus();
        return;
    }

    const newTask = {

        id: Date.now(),

        text: text,

        completed: false,

        createdAt: new Date().toLocaleString()

    };

    tasks.unshift(newTask);

    saveTasks();

    taskInput.value = "";

    render();

    taskInput.focus();

}


/* =========================
   TOGGLE TASK
========================= */

function toggleTask(id) {

    tasks = tasks.map(task => {

        if (task.id === id) {

            return {
                ...task,
                completed: !task.completed
            };

        }

        return task;

    });

    saveTasks();

    render();

}


/* =========================
   DELETE TASK
========================= */

function deleteTask(id) {

    const task = tasks.find(task => task.id === id);

    if (!task) return;

    deletedTask = task;

    tasks = tasks.filter(task => task.id !== id);

    saveTasks();

    render();

    undoBtn.classList.remove("hidden");

}


/* =========================
   UNDO DELETE
========================= */

function undoDelete() {

    if (!deletedTask) return;

    tasks.unshift(deletedTask);

    deletedTask = null;

    saveTasks();

    render();

    undoBtn.classList.add("hidden");

}


/* =========================
   EDIT TASK
========================= */

function editTask(id) {

    const taskElement =
        document.querySelector(`[data-id="${id}"]`);

    if (!taskElement) return;

    const task = tasks.find(task => task.id === id);

    if (!task) return;

    const content =
        taskElement.querySelector(".task-content");

    content.innerHTML = `

        <input
            class="edit-input"
            value="${escapeHTML(task.text)}"
            maxlength="120"
        >

    `;

    const input =
        content.querySelector(".edit-input");

    input.focus();

    input.select();

    input.addEventListener("keydown", event => {

        if (event.key === "Enter") {

            finishEdit(id, input.value);

        }

        if (event.key === "Escape") {

            render();

        }

    });

}


/* =========================
   FINISH EDIT
========================= */

function finishEdit(id, newText) {

    newText = newText.trim();

    if (!newText) {

        render();

        return;

    }

    tasks = tasks.map(task => {

        if (task.id === id) {

            return {
                ...task,
                text: newText
            };

        }

        return task;

    });

    saveTasks();

    render();

}


/* =========================
   FILTER
========================= */

function getFilteredTasks() {

    let filtered = [...tasks];

    if (currentFilter === "active") {

        filtered =
            filtered.filter(task => !task.completed);

    }

    if (currentFilter === "completed") {

        filtered =
            filtered.filter(task => task.completed);

    }

    if (searchQuery) {

        filtered =
            filtered.filter(task =>
                task.text
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
            );

    }

    return filtered;

}


/* =========================
   RENDER
========================= */

function render() {

    const filteredTasks =
        getFilteredTasks();

    taskList.innerHTML = "";

    filteredTasks.forEach(task => {

        const element =
            createTaskElement(task);

        taskList.appendChild(element);

    });

    emptyState.style.display =
        filteredTasks.length === 0
            ? "block"
            : "none";

    updateStats();

}


/* =========================
   CREATE DOM ELEMENT
========================= */

function createTaskElement(task) {

    const div = document.createElement("div");

    div.className =
        `task ${task.completed ? "completed" : ""}`;

    div.dataset.id = task.id;

    div.innerHTML = `

        <button
            class="check"
            data-action="toggle"
            aria-label="Complete task"
        >
            ${task.completed ? "✓" : ""}
        </button>

        <div class="task-content">

            <div class="task-title">
                ${escapeHTML(task.text)}
            </div>

            <div class="task-date">
                Added ${task.createdAt}
            </div>

        </div>

        <div class="task-actions">

            <button
                class="action-btn"
                data-action="edit"
                title="Edit"
            >
                ✏️
            </button>

            <button
                class="action-btn delete-btn"
                data-action="delete"
                title="Delete"
            >
                🗑️
            </button>

        </div>

    `;

    return div;

}


/* =========================
   EVENT DELEGATION
========================= */

taskList.addEventListener("click", event => {

    const button =
        event.target.closest("[data-action]");

    if (!button) return;

    const taskElement =
        button.closest(".task");

    if (!taskElement) return;

    const id =
        Number(taskElement.dataset.id);

    const action =
        button.dataset.action;

    if (action === "toggle") {

        toggleTask(id);

    }

    if (action === "edit") {

        editTask(id);

    }

    if (action === "delete") {

        deleteTask(id);

    }

});


/* =========================
   FILTER EVENTS
========================= */

document.querySelector(".filters")
    .addEventListener("click", event => {

        const button =
            event.target.closest(".filter");

        if (!button) return;

        currentFilter =
            button.dataset.filter;

        document
            .querySelectorAll(".filter")
            .forEach(btn =>
                btn.classList.remove("active")
            );

        button.classList.add("active");

        render();

    });


/* =========================
   SEARCH
========================= */

searchInput.addEventListener("input", event => {

    searchQuery = event.target.value;

    render();

});


/* =========================
   ADD EVENTS
========================= */

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", event => {

    if (event.key === "Enter") {

        addTask();

    }

});


/* =========================
   CLEAR COMPLETED
========================= */

clearCompletedBtn.addEventListener(
    "click",
    () => {

        tasks =
            tasks.filter(task => !task.completed);

        saveTasks();

        render();

    }
);


/* =========================
   UNDO
========================= */

undoBtn.addEventListener(
    "click",
    undoDelete
);


/* =========================
   STATISTICS
========================= */

function updateStats() {

    const total = tasks.length;

    const completed =
        tasks.filter(task => task.completed).length;

    const active =
        total - completed;

    const progress =
        total === 0
            ? 0
            : Math.round((completed / total) * 100);

    totalCount.textContent = total;

    activeCount.textContent = active;

    completedCount.textContent = completed;

    progressText.textContent =
        `${progress}%`;

    progressBar.style.width =
        `${progress}%`;

    taskSummary.textContent =
        `${total} ${total === 1 ? "task" : "tasks"}`;

}


/* =========================
   DARK MODE
========================= */

const savedTheme =
    localStorage.getItem("ledgerTheme");

if (savedTheme === "dark") {

    document.body.classList.add("dark");

    themeBtn.textContent = "☀️";

}

themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const dark =
        document.body.classList.contains("dark");

    localStorage.setItem(
        "ledgerTheme",
        dark ? "dark" : "light"
    );

    themeBtn.textContent =
        dark ? "☀️" : "🌙";

});


/* =========================
   HTML SAFETY
========================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


/* =========================
   INITIAL RENDER
========================= */

render();
 
