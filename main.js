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

// --- 0. AUTH CHECK & DYNAMIC PATH ---
const userKey = localStorage.getItem("dnotes_user");
if (!userKey) {
    window.location.href = "index.html";
}

// All data now lives under users/sanitized_email/notes
const notesRef = ref(db, `users/${userKey}/notes`);

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
        if(screen) {
            screen.style.opacity = "0";
            setTimeout(() => screen.style.display = "none", 800);
        }
    }
}
window.addEventListener("DOMContentLoaded", cycleGreetings);

// --- 2. AUTO-NUMBERING SYSTEM ---
const setupAutoNumbering = (elId) => {
    const el = document.getElementById(elId);
    if(!el) return;
    el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const textBefore = el.value.substring(0, start);
            const lines = textBefore.split("\n");
            const lastLine = lines[lines.length - 1];
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
const toggleModal = (modal, state) => { if(modal) modal.style.display = state ? "flex" : "none"; };
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
// --- 5. UPDATED FIREBASE DATA (Order removed) ---
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
    document.getElementById("reminderInput").value = ""; // Clear reminder too
};

document.getElementById("updateBtn").onclick = () => {
    const key = document.getElementById("editKey").value;
    
    update(ref(db, `users/${userKey}/notes/${key}`), {
        title: document.getElementById("editTitleInput").value,
        content: document.getElementById("editContentInput").value,
        reminder: document.getElementById("editReminderInput").value,
        priority: document.getElementById("editPriorityInput").value,
        category: document.getElementById("editCategoryInput").value
    });
    
    toggleModal(editModal, false);
};
// --- LISTEN FOR ADMIN MESSAGES ---
const adminMsgRef = ref(db, `users/${userKey}/admin_msg`);
onValue(adminMsgRef, (snapshot) => {
    if (snapshot.exists()) {
        const data = snapshot.val();
        // Create a special alert or banner at the top of the notes list
        const msgDiv = document.createElement("div");
        msgDiv.style = "background: #6366f1; color: white; padding: 15px; border-radius: 12px; margin-bottom: 20px; position: relative; font-weight: 500; border-left: 5px solid #4338ca;";
        msgDiv.innerHTML = `
            <small style="opacity:0.8; display:block; margin-bottom:5px;">MESSAGE FROM ADMIN:</small>
            ${data.text}
            <button id="closeMsg" style="position:absolute; right:10px; top:10px; background:none; border:none; color:white; cursor:pointer; font-weight:bold;">✕</button>
        `;
        
        // Push it to the top of the notes container
        const container = document.querySelector(".notes-section");
        const existingMsg = document.getElementById("admin-broadcast");
        if (existingMsg) existingMsg.remove(); // Remove old one if it exists
        
        msgDiv.id = "admin-broadcast";
        container.prepend(msgDiv);

        document.getElementById("closeMsg").onclick = () => {
            // Optional: Remove it from DB when user closes it
            // remove(adminMsgRef); 
            msgDiv.remove();
        };
    }
});
function renderNotes() {
    onValue(notesRef, (snapshot) => {
        notesList.innerHTML = "";
        let tasks = [];
        snapshot.forEach(child => { tasks.push({ key: child.key, ...child.val() }); });

        tasks = tasks.filter(t => t.category === currentFilter);
        
        tasks.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
            // Removed order comparison
            return b.createdAt - a.createdAt; // Newer notes at the top
        });

        tasks.forEach((data, index) => { // Added index here
            const li = document.createElement("li");
            const isUrgent = data.priority === 'urgent';
            li.className = `note-item ${data.completed ? 'note-completed' : ''} ${isUrgent ? 'note-urgent' : ''}`;
            
            // Inside tasks.forEach in renderNotes
li.innerHTML = `
<div class="note-title">
    <span class="note-number">${index + 1}.</span> ${data.title} ${isUrgent ? '⚠️' : ''}
</div>
<div class="note-content">${data.content}</div>
<div class="note-status-print" style="display:none; font-size: 0.8rem; font-weight: bold; color: #16a34a;">
    Status: ${data.completed ? 'Completed' : 'Pending'}
</div>
<span class="note-time">${data.reminder ? '🔔 ' + new Date(data.reminder).toLocaleString() : 'No reminder'}</span>
<div class="note-actions">
    <button style="background:#16a34a;" class="done-btn">${data.completed ? 'Undo' : 'Done'}</button>
    <button style="background:#f59e0b;" class="edit-btn">Edit</button>
    <button style="background:#ef4444;" class="del-btn">Delete</button>
</div>
`;

            // Updated all child paths to include userKey
            li.querySelector(".done-btn").onclick = () => update(ref(db, `users/${userKey}/notes/${data.key}`), { completed: !data.completed });
            li.querySelector(".del-btn").onclick = () => confirm("Delete?") && remove(ref(db, `users/${userKey}/notes/${data.key}`));
            li.querySelector(".edit-btn").onclick = () => {
                document.getElementById("editKey").value = data.key;
                document.getElementById("editTitleInput").value = data.title;
                document.getElementById("editContentInput").value = data.content;
                document.getElementById("editReminderInput").value = data.reminder;
                // REMOVED: document.getElementById("editOrderInput").value = data.order; 
                document.getElementById("editPriorityInput").value = data.priority;
                document.getElementById("editCategoryInput").value = data.category; // Ensure category is set
                toggleModal(editModal, true);
            };
            notesList.appendChild(li);
        });
    });
}

renderNotes();

document.getElementById("downloadPdfBtn").onclick = () => {
    const element = document.getElementById("notesList");
    
    // 1. Create a container to hold our Heading + the Notes
    const pdfContainer = document.createElement("div");
    pdfContainer.style.padding = "20px";
    pdfContainer.style.fontFamily = "'Segoe UI', sans-serif";

    // 2. Add the dynamic Heading
    const categoryName = currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1);
    const heading = document.createElement("h1");
    heading.innerText = `DNotes: ${categoryName} Notes Report`;
    heading.style.color = "#1e293b";
    heading.style.borderBottom = "2px solid #4f46e5";
    heading.style.paddingBottom = "10px";
    heading.style.marginBottom = "20px";
    pdfContainer.appendChild(heading);

    // 3. Clone and clean the notes
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.note-item').forEach(note => {
        // Remove strikethrough/fading for PDF
        note.style.opacity = "1";
        const title = note.querySelector('.note-title');
        if (title) {
            title.style.textDecoration = "none";
            title.style.color = "#1e293b";
        }

        // Show "Status" text for PDF
        const statusText = note.querySelector('.note-status-print');
        if (statusText) {
            statusText.style.display = "block";
        }

        // Remove UI buttons
        const actions = note.querySelector('.note-actions');
        if (actions) actions.remove();
    });

    pdfContainer.appendChild(clone);

    // 4. PDF Configuration
    const opt = {
        margin:       10,
        filename:     `DNotes_${categoryName}_Report.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfContainer).save();
};
// --- LOGOUT LOGIC ---
document.getElementById("logoutBtn").onclick = () => {
    if (confirm("Are you sure you want to log out?")) {
        // 1. Clear the user key so the app "forgets" them
        localStorage.removeItem("dnotes_user");
        
        // 2. Redirect to the login page (index.html)
        window.location.href = "index.html";
    }
};
