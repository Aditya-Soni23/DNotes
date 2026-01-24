import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZTkOnUFqFdNAoK63dI2iCzDoykAjSylI",
    authDomain: "dnotes-cf9f2.firebaseapp.com",
    databaseURL: "https://dnotes-cf9f2-default-rtdb.firebaseio.com",
    projectId: "dnotes-cf9f2",
    storageBucket: "dnotes-cf9f2.firebasestorage.app",
    messagingSenderId: "886010408120",
    appId: "1:886010408120:web:e85c8681e72552c33f584d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const notesRef = ref(db, "DNotes");

const notesList = document.getElementById("notesList");
const taskModal = document.getElementById("taskModal");
const editModal = document.getElementById("editModal");
let currentFilter = "personal";

// --- 1. IPHONE STYLE WELCOME SEQUENCER ---
const greetings = ["Hello", "नमस्ते"];
let greetIdx = 0;
const welcomeTxt = document.getElementById("welcome-text");

function cycleGreetings() {
    if (greetIdx < greetings.length) {
        welcomeTxt.style.opacity = 0;
        setTimeout(() => {
            welcomeTxt.innerText = greetings[greetIdx];
            welcomeTxt.style.opacity = 1;
            greetIdx++;
            setTimeout(cycleGreetings, 400); 
        }, 300);
    } else {
        const screen = document.getElementById("welcome-screen");
        screen.style.opacity = "0";
        setTimeout(() => screen.style.display = "none", 800);
    }
}
window.addEventListener("DOMContentLoaded", cycleGreetings);

// --- 2. AUTO-NUMBERING SYSTEM ---
const setupAutoNumbering = (elId) => {
    const el = document.getElementById(elId);
    el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const textBefore = el.value.substring(0, start);
            const lines = textBefore.split("\n");
            const lastLine = lines[lines.length - 1];
            
            // Matches numbers like "1. ", "2. ", etc.
            const match = lastLine.match(/^(\d+)\.\s/);
            if (match) {
                e.preventDefault();
                const nextNum = parseInt(match[1]) + 1;
                const insert = `\n${nextNum}. `;
                el.value = el.value.substring(0, start) + insert + el.value.substring(end);
                el.selectionStart = el.selectionEnd = start + insert.length;
            }
        }
    });
};
setupAutoNumbering("contentInput");
setupAutoNumbering("editContentInput");

// --- MODALS & FILTERS ---
const toggleModal = (modal, state) => modal.style.display = state ? "flex" : "none";
document.getElementById("openModalBtn").onclick = () => toggleModal(taskModal, true);
document.getElementById("closeModalBtn").onclick = () => toggleModal(taskModal, false);
document.getElementById("closeEditModalBtn").onclick = () => toggleModal(editModal, false);

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelector(".filter-btn.active").classList.remove("active");
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        document.getElementById("listTitle").innerText = `${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} Notes`;
        renderNotes();
    };
});

// --- FIREBASE DATA ---
document.getElementById("addBtn").onclick = () => {
    const title = document.getElementById("titleInput").value.trim();
    if (!title) return alert("Title required");
    push(notesRef, {
        title, 
        content: document.getElementById("contentInput").value.trim(),
        reminder: document.getElementById("reminderInput").value,
        order: parseInt(document.getElementById("orderInput").value) || 1,
        priority: document.getElementById("priorityInput").value,
        category: document.getElementById("categoryInput").value,
        completed: false,
        createdAt: Date.now()
    });
    toggleModal(taskModal, false);
    document.getElementById("titleInput").value = "";
    document.getElementById("contentInput").value = "";
};

document.getElementById("updateBtn").onclick = () => {
    const key = document.getElementById("editKey").value;
    update(ref(db, `DNotes/${key}`), {
        title: document.getElementById("editTitleInput").value,
        content: document.getElementById("editContentInput").value,
        reminder: document.getElementById("editReminderInput").value,
        order: parseInt(document.getElementById("editOrderInput").value) || 1,
        priority: document.getElementById("editPriorityInput").value,
        category: document.getElementById("editCategoryInput").value
    });
    toggleModal(editModal, false);
};

function renderNotes() {
    onValue(notesRef, (snapshot) => {
        notesList.innerHTML = "";
        let tasks = [];
        snapshot.forEach(child => { tasks.push({ key: child.key, ...child.val() }); });

        tasks = tasks.filter(t => t.category === currentFilter);
        
        // SORTING: Completed status -> Urgent vs Normal -> Numerical Order
        tasks.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
            if (a.order !== b.order) return a.order - b.order;
            return b.createdAt - a.createdAt;
        });

        tasks.forEach(data => {
            const li = document.createElement("li");
            const isUrgent = data.priority === 'urgent';
            li.className = `note-item ${data.completed ? 'note-completed' : ''} ${isUrgent ? 'note-urgent' : ''}`;
            
            li.innerHTML = `
                <div class="note-title">${data.title} ${isUrgent ? '⚠️' : ''}</div>
                <div class="note-content">${data.content}</div>
                <span class="note-time">${data.reminder ? '🔔 ' + new Date(data.reminder).toLocaleString() : 'No reminder'}</span>
                <div class="note-actions">
                    <button style="background:#16a34a;" class="done-btn">${data.completed ? 'Undo' : 'Done'}</button>
                    <button style="background:#f59e0b;" class="edit-btn">Edit</button>
                    <button style="background:#ef4444;" class="del-btn">Delete</button>
                </div>
            `;

            li.querySelector(".done-btn").onclick = () => update(ref(db, `DNotes/${data.key}`), { completed: !data.completed });
            li.querySelector(".del-btn").onclick = () => confirm("Delete?") && remove(ref(db, `DNotes/${data.key}`));
            li.querySelector(".edit-btn").onclick = () => {
                document.getElementById("editKey").value = data.key;
                document.getElementById("editTitleInput").value = data.title;
                document.getElementById("editContentInput").value = data.content;
                document.getElementById("editReminderInput").value = data.reminder;
                document.getElementById("editOrderInput").value = data.order;
                document.getElementById("editPriorityInput").value = data.priority;
                toggleModal(editModal, true);
            };
            notesList.appendChild(li);
        });
    });
}

renderNotes();