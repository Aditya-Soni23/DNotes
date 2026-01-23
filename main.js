import { initializeApp } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
  import { update } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


import { getDatabase, ref, push, onValue, remove } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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

// DNotes path
const notesRef = ref(db, "DNotes");


// ===============================
// DOM Elements
// ===============================
const titleInput = document.getElementById("titleInput");
const contentInput = document.getElementById("contentInput");
const reminderInput = document.getElementById("reminderInput");
const addBtn = document.getElementById("addBtn");
const notesList = document.getElementById("notesList");
const priorityInput = document.getElementById("priorityInput");

// ===============================
// Add Note
// ===============================
addBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const reminder = reminderInput.value;
  const priority = priorityInput.value;

  if (!title && !content) {
    alert("Please write something");
    return;
  }

  push(notesRef, {
    title,
    content,
    reminder,
    priority,
    completed: false,
    createdAt: Date.now()
  });

  titleInput.value = "";
  contentInput.value = "";
  reminderInput.value = "";
  priorityInput.value = "normal";
});

// ===============================
// Render Notes (Realtime)
// ===============================
onValue(notesRef, (snapshot) => {
  notesList.innerHTML = "";
  let count = 1;

  snapshot.forEach((child) => {
    const data = child.val();
    const key = child.key;

    const li = document.createElement("li");
    li.className = "note-item";

    if (data.completed) li.classList.add("note-completed");
    if (data.priority === "urgent") li.classList.add("note-urgent");

    const number = document.createElement("div");
    number.textContent = `#${count++}`;
    number.style.fontWeight = "bold";
    number.style.marginBottom = "4px";

    const title = document.createElement("div");
    title.className = "note-title";
    title.textContent = data.title || "Untitled";

    if (data.priority === "urgent") {
      const badge = document.createElement("span");
      badge.className = "urgent-badge";
      badge.textContent = " ⚠️";
      title.appendChild(badge);
    }

    const content = document.createElement("div");
    content.className = "note-content";
    content.textContent = data.content || "";

    const time = document.createElement("div");
    time.className = "note-time";
    time.textContent = data.reminder
      ? "Reminder: " + new Date(data.reminder).toLocaleString()
      : "No reminder";

    const completeBtn = document.createElement("button");
    completeBtn.textContent = data.completed ? "Undo" : "Complete";
    completeBtn.style.marginTop = "8px";
    completeBtn.style.background = "#16a34a";

    completeBtn.onclick = () => {
      const noteRef = ref(db, `DNotes/${key}`);
      update(noteRef, {
        completed: !data.completed
      });
    };

    li.append(number, title, content, time, completeBtn);
    notesList.prepend(li);
  });
});
