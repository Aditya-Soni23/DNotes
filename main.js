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

document.getElementById("addBtn").onclick = () => {
    const title = document.getElementById("titleInput").value.trim();
    if (!title) return alert("Title required");
    push(notesRef, {
        title, 
        content: document.getElementById("contentInput").value.trim(),
        reminder: document.getElementById("reminderInput").value,
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
        tasks.sort((a, b) => (a.completed === b.completed) ? (b.createdAt - a.createdAt) : (a.completed ? 1 : -1));

        tasks.forEach(data => {
            const li = document.createElement("li");
            li.className = `note-item ${data.completed ? 'note-completed' : ''} ${data.priority === 'urgent' ? 'note-urgent' : ''}`;
            li.innerHTML = `
                <div class="note-title">${data.title} ${data.priority === 'urgent' ? '⚠️' : ''}</div>
                <div class="note-content">${data.content}</div>
                <span class="note-time">${data.reminder ? '🔔 ' + new Date(data.reminder).toLocaleString() : 'No reminder'}</span>
                <div class="note-actions">
                    <button style="background:#16a34a;" class="done-btn">${data.completed ? 'Undo' : 'Done'}</button>
                    <button style="background:#f59e0b;" class="edit-btn">Edit</button>
                    <button style="background:#ef4444;" class="del-btn">Delete</button>
                </div>
            `;

            li.querySelector(".done-btn").onclick = () => update(ref(db, `DNotes/${data.key}`), { completed: !data.completed });
            li.querySelector(".del-btn").onclick = () => confirm("Delete note?") && remove(ref(db, `DNotes/${data.key}`));
            li.querySelector(".edit-btn").onclick = () => {
                document.getElementById("editKey").value = data.key;
                document.getElementById("editTitleInput").value = data.title;
                document.getElementById("editContentInput").value = data.content;
                document.getElementById("editReminderInput").value = data.reminder;
                toggleModal(editModal, true);
            };
            notesList.appendChild(li);
        });
    });
}

// --- CLEAN PDF EXPORT ---
document.getElementById("downloadPdfBtn").onclick = () => {
    const tempDiv = document.createElement("div");
    tempDiv.style.padding = "20px";
    tempDiv.innerHTML = `<h1 style="color:#4f46e5; margin-bottom:20px;">${currentFilter.toUpperCase()} NOTES</h1>`;
    
    // Select all rendered note items
    const notes = document.querySelectorAll(".note-item");
    
    notes.forEach(note => {
        const clone = note.cloneNode(true);
        
        // 1. Remove Action Buttons
        const actions = clone.querySelector(".note-actions");
        if(actions) actions.remove();

        // 2. Clear Visual Strikethrough for PDF
        const title = clone.querySelector(".note-title");
        if(title) {
            title.style.textDecoration = "none";
            title.style.color = "#1e293b";
        }
        clone.style.opacity = "1";
        clone.style.background = "#ffffff";
        clone.style.border = "1px solid #e2e8f0";

        // 3. Add Text Status Label
        const isCompleted = note.classList.contains("note-completed");
        const statusLabel = document.createElement("div");
        statusLabel.style.marginTop = "10px";
        statusLabel.style.fontSize = "0.8rem";
        statusLabel.style.fontWeight = "bold";
        statusLabel.style.color = isCompleted ? "#16a34a" : "#64748b";
        statusLabel.innerText = "STATUS: " + (isCompleted ? "COMPLETED" : "PENDING");
        
        clone.appendChild(statusLabel);
        tempDiv.appendChild(clone);
    });

    const opt = {
        margin: 0.5,
        filename: `DNotes_${currentFilter}_List.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(tempDiv).save();
};

renderNotes();