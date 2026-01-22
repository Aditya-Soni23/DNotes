import { initializeApp } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

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

// ===============================
// Add Note
// ===============================
addBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const reminder = reminderInput.value;

  if (!title && !content) {
    alert("Please write something");
    return;
  }

  push(notesRef, {
    title,
    content,
    reminder,
    createdAt: Date.now()
  });

  titleInput.value = "";
  contentInput.value = "";
  reminderInput.value = "";
});

// ===============================
// Render Notes (Realtime)
// ===============================
onValue(notesRef, (snapshot) => {
  notesList.innerHTML = "";

  snapshot.forEach((child) => {
    const data = child.val();
    const key = child.key;

    const li = document.createElement("li");
    li.className = "note-item";

    const title = document.createElement("div");
    title.className = "note-title";
    title.textContent = data.title || "Untitled";

    const content = document.createElement("div");
    content.className = "note-content";
    content.textContent = data.content || "";

    const time = document.createElement("div");
    time.className = "note-time";
    time.textContent = data.reminder
      ? "Reminder: " + new Date(data.reminder).toLocaleString()
      : "No reminder";

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.style.marginTop = "8px";
    delBtn.style.background = "#dc2626";

    delBtn.onclick = () => {
      remove(ref(db, `DNotes/${key}`));
    };

    li.appendChild(title);
    li.appendChild(content);
    li.appendChild(time);
    li.appendChild(delBtn);

    notesList.prepend(li);
  });
});
