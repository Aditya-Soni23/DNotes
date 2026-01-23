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

// UI Elements
const notesList = document.getElementById("notesList");
const taskModal = document.getElementById("taskModal");
const editModal = document.getElementById("editModal");
let currentFilter = "personal";

// Helper: Toggle Modals
const toggleModal = (modal, state) => modal.style.display = state ? "flex" : "none";

// Event Listeners for Open/Close
document.getElementById("openModalBtn").onclick = () => toggleModal(taskModal, true);
document.getElementById("closeModalBtn").onclick = () => toggleModal(taskModal, false);
document.getElementById("closeEditModalBtn").onclick = () => toggleModal(editModal, false);

// Filter Logic
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelector(".filter-btn.active").classList.remove("active");
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        document.getElementById("listTitle").innerText = `${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} Notes`;
        renderNotes();
    };
});

// Create Note
document.getElementById("addBtn").onclick = () => {
    const note = {
        title: document.getElementById("titleInput").value.trim(),
        content: document.getElementById("contentInput").value.trim(),
        reminder: document.getElementById("reminderInput").value,
        priority: document.getElementById("priorityInput").value,
        category: document.getElementById("categoryInput").value,
        completed: false,
        createdAt: Date.now()
    };
    if (note.title) {
        push(notesRef, note);
        toggleModal(taskModal, false);
        // Clear inputs
        ["titleInput", "contentInput", "reminderInput"].forEach(id => document.getElementById(id).value = "");
    }
};

// Update Note
document.getElementById("updateBtn").onclick = () => {
    const key = document.getElementById("editKey").value;
    const data = {
        title: document.getElementById("editTitleInput").value,
        content: document.getElementById("editContentInput").value,
        reminder: document.getElementById("editReminderInput").value,
        priority: document.getElementById("editPriorityInput").value,
        category: document.getElementById("editCategoryInput").value
    };
    update(ref(db, `DNotes/${key}`), data).then(() => toggleModal(editModal, false));
};

// Render Logic
function renderNotes() {
    onValue(notesRef, (snapshot) => {
        notesList.innerHTML = "";
        let tasks = [];
        snapshot.forEach(child => { tasks.push({ key: child.key, ...child.val() }); });

        tasks = tasks.filter(t => t.category === currentFilter);
        // Sort: Not Completed First, then by Date
        tasks.sort((a, b) => (a.completed === b.completed) ? (b.createdAt - a.createdAt) : (a.completed ? 1 : -1));

        tasks.forEach(data => {
            const li = document.createElement("li");
            li.className = `note-item ${data.completed ? 'note-completed' : ''} ${data.priority === 'urgent' ? 'note-urgent' : ''}`;
            li.innerHTML = `
                <div class="note-title">${data.title} ${data.priority === 'urgent' ? '<span>⚠️</span>' : ''}</div>
                <div class="note-content">${data.content}</div>
                <div class="note-time">${data.reminder ? '🔔 ' + new Date(data.reminder).toLocaleString() : ''}</div>
                <div class="note-actions">
                    <button class="btn btn-primary done-btn">${data.completed ? 'Undo' : 'Done'}</button>
                    <button class="btn btn-secondary edit-btn">Edit</button>
                    <button class="btn btn-cancel del-btn">Delete</button>
                </div>
            `;

            li.querySelector(".done-btn").onclick = () => update(ref(db, `DNotes/${data.key}`), { completed: !data.completed });
            li.querySelector(".del-btn").onclick = () => confirm("Delete note?") && remove(ref(db, `DNotes/${data.key}`));
            li.querySelector(".edit-btn").onclick = () => {
                document.getElementById("editKey").value = data.key;
                document.getElementById("editTitleInput").value = data.title;
                document.getElementById("editContentInput").value = data.content;
                document.getElementById("editReminderInput").value = data.reminder;
                document.getElementById("editPriorityInput").value = data.priority;
                document.getElementById("editCategoryInput").value = data.category;
                toggleModal(editModal, true);
            };
            notesList.appendChild(li);
        });
    });
}

// PDF Export (Clean version)
document.getElementById("downloadPdfBtn").onclick = () => {
    const tempDiv = document.createElement("div");
    tempDiv.style.padding = "30px";
    tempDiv.innerHTML = `<h1 style="margin-bottom:20px;">${currentFilter.toUpperCase()} NOTES</h1>`;
    
    document.querySelectorAll(".note-item").forEach(note => {
        const clone = note.cloneNode(true);
        clone.querySelector(".note-actions").remove();
        clone.style.opacity = "1";
        clone.style.textDecoration = "none";
        
        const status = document.createElement("p");
        status.style.fontWeight = "bold";
        status.innerText = "STATUS: " + (note.classList.contains("note-completed") ? "COMPLETED" : "PENDING");
        clone.appendChild(status);
        tempDiv.appendChild(clone);
    });

    html2pdf().set({ margin: 0.5, filename: `DNotes_${currentFilter}.pdf` }).from(tempDiv).save();
};

renderNotes();