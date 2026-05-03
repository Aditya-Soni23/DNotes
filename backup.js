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
//const userKey = localStorage.getItem("dnotes_user");
//if (!userKey) {
  //  window.location.href = "index.html";
//}

// All data now lives under users/sanitized_email/notes
//const notesRef = ref(db, `users/${userKey}/notes`);

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
    if (!el) return;
    el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const start = el.selectionStart;
            const text = el.value;
            
            // Find the current line the user is on
            const textBefore = text.substring(0, start);
            const linesBefore = textBefore.split("\n");
            const currentLine = linesBefore[linesBefore.length - 1];
            
            // Check if current line starts with "Number. "
            const match = currentLine.match(/^(\d+)\.\s/);
            
            if (match) {
                e.preventDefault();
                const currentNum = parseInt(match[1]);
                const nextNum = currentNum + 1;
                
                // Get the text after the cursor
                let textAfter = text.substring(start);
                const linesAfter = textAfter.split("\n");
                
                // Smart Scan: Update numbers on subsequent lines
                const updatedLinesAfter = linesAfter.map(line => {
                    const lineMatch = line.match(/^(\d+)\.\s/);
                    if (lineMatch) {
                        const existingNum = parseInt(lineMatch[1]);
                        // Only increment if the number is equal to or greater than the one we're inserting
                        if (existingNum >= nextNum) {
                            return (existingNum + 1) + line.substring(lineMatch[1].length);
                        }
                    }
                    return line;
                });

                const insert = `\n${nextNum}. `;
                const newTextAfter = updatedLinesAfter.join("\n");
                
                // Update textarea value
                el.value = textBefore + insert + newTextAfter;
                
                // Put cursor back in the right spot
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
    
    // Select the specific edit reminder input
    const editReminderEl = document.getElementById("editReminderInput");
    const updatedReminder = editReminderEl ? editReminderEl.value : "";

    update(ref(db, `users/${userKey}/notes/${key}`), {
        title: document.getElementById("editTitleInput").value,
        content: document.getElementById("editContentInput").value,
        reminder: updatedReminder, // This ensures the new date is sent to Firebase
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
                // Fill the hidden key
                document.getElementById("editKey").value = data.key;
                
                // Fill Title and Content
                document.getElementById("editTitleInput").value = data.title;
                document.getElementById("editContentInput").value = data.content;
                
                // Fill the Date (Make sure the ID in your HTML is 'editReminderInput')
                const editDateEl = document.getElementById("editReminderInput");
                if (editDateEl) {
                    editDateEl.value = data.reminder || "";
                }
                
                // Fill Dropdowns
                document.getElementById("editPriorityInput").value = data.priority || "normal";
                document.getElementById("editCategoryInput").value = data.category || "personal";
                
                toggleModal(editModal, true);
            };
            notesList.appendChild(li);
        });
    });
}

renderNotes();


document.getElementById("downloadPdfBtn").onclick = () => {
    const element = document.getElementById("notesList");
    const categoryName = currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1);
    
    // 1. Force the page to top before capture (Fixes blank page issues)
    window.scrollTo(0, 0);

    // 2. Create the wrapper for the PDF
    const pdfContainer = document.createElement("div");
    pdfContainer.style.padding = "10px";
    pdfContainer.style.background = "#fff";

    // 3. Header styling
    const header = document.createElement("div");
    header.innerHTML = `
        <h1 style="color:#1e293b; border-bottom:3px solid #4f46e5; padding-bottom:10px; margin-bottom:20px; font-family: sans-serif;">
            DNotes: ${categoryName} Report
        </h1>
    `;
    pdfContainer.appendChild(header);

    // 4. Clone and Clean
    const clone = element.cloneNode(true);
    clone.style.display = "block"; // Ensure it's visible for the capture
    
    clone.querySelectorAll('.note-item').forEach(note => {
        note.style.opacity = "1";
        note.style.boxShadow = "none";
        note.style.border = "1px solid #e2e8f0";
        note.style.borderLeft = "5px solid " + (note.classList.contains('note-urgent') ? "#ef4444" : "#e2e8f0");
        note.style.marginBottom = "15px";
        note.style.pageBreakInside = "avoid"; // Keep note as one block
        
        // Remove UI buttons
        const actions = note.querySelector('.note-actions');
        if (actions) actions.remove();
        
        // Show status for printing
        const statusText = note.querySelector('.note-status-print');
        if (statusText) statusText.style.display = "block";
    });

    pdfContainer.appendChild(clone);

    // 5. PDF Options - Optimized for multi-page
    const opt = {
        margin: 10,
        filename: `DNotes_${categoryName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            logging: false, 
            scrollY: 0, // Critical: capture from the top of the container
            useCORS: true 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] } // Uses your CSS page-break rules
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
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log("Service Worker Registered!"))
      .catch((err) => console.log("SW Registration Failed", err));
}
function startHourlyReminders() {
    // Request permission first
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            setInterval(() => {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification("DNotes 💎", {
                        body: "Time to check your notes and reminders!",
                        icon: "Diamond_Comapny_Logo.png",
                        vibrate: [200, 100, 200],
                        badge: "Diamond_Comapny_Logo.png"
                    });
                });
            }, 3600000); // 3600000ms = 1 hour
        }
    });
}

// Start the timer when the user logs in
if (localStorage.getItem("dnotes_user")) {
    startHourlyReminders();
}