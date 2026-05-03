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
};

 //All data now lives under users/sanitized_email/notes
const notesRef = ref(db, `users/${userKey}/notes`);

const notesList = document.getElementById("notesList");
const taskModal = document.getElementById("taskModal");
const editModal = document.getElementById("editModal");
let currentFilter = "personal";
let sortMode = "none";
let draggedItem = null;

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

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");

menuBtn.onclick = () => {
    sidebar.classList.add("open");
    overlay.classList.add("show");
};

overlay.onclick = () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
};



const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

let searchQuery = "";

// Toggle search bar
searchBtn.onclick = () => {
    searchInput.classList.toggle("active");
    searchInput.focus();
};

// Capture typing
searchInput.oninput = (e) => {
    searchQuery = e.target.value.toLowerCase();

    if (!searchQuery) {
        searchInput.classList.remove("active");
    }

    renderNotes();
};


const sortToggle = document.getElementById("sortToggle");
const sortDropdown = document.getElementById("sortDropdown");

// open/close dropdown
sortToggle.onclick = () => {
    sortDropdown.classList.toggle("show");
};

// select option
sortDropdown.querySelectorAll("div").forEach(option => {
    option.onclick = () => {
        sortMode = option.dataset.sort;

        // change button text
        sortToggle.innerText = `Filter: ${option.innerText} ⏷`;

        sortDropdown.classList.remove("show");
        renderNotes();
    };
});

// close when clicking outside
document.addEventListener("click", (e) => {
    if (!sortToggle.contains(e.target) && !sortDropdown.contains(e.target)) {
        sortDropdown.classList.remove("show");
    }
});

            
document.addEventListener("click", () => {
    document.querySelectorAll(".menu-dropdown").forEach(d => {
        d.classList.remove("show");
    });

    document.querySelectorAll(".note-item").forEach(n => {
        n.classList.remove("active");
    });
});

// --- 2. AUTO-NUMBERING SYSTEM ---
// --- 2. DYNAMIC AUTO-NUMBERING SYSTEM ---
const setupAutoNumbering = (elId) => {
    const el = document.getElementById(elId);
    if (!el) return;

    el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;

        const start = el.selectionStart;
        const text = el.value;

        // Find the current line the cursor is on
        const textBefore = text.substring(0, start);
        const linesBefore = textBefore.split("\n");
        const currentLine = linesBefore[linesBefore.length - 1];

        // Check if current line starts with "Number. "
        const match = currentLine.match(/^(\d+)\.\s/);
        if (!match) return;

        e.preventDefault(); // Stop default enter key

        const currentNum = parseInt(match[1]);
        const nextNum = currentNum + 1;

        // Split everything after the cursor
        const textAfter = text.substring(start);
        let linesAfter = textAfter.split("\n");

        // --- THE MAGIC: RE-NUMBERING THE REMAINING LINES ---
        // We only increment lines that are part of the sequence immediately following
        let expectedNum = nextNum;
        const updatedLinesAfter = linesAfter.map((line) => {
            const lineMatch = line.match(/^(\d+)\.\s(.*)/);
            if (lineMatch) {
                const actualNum = parseInt(lineMatch[1]);
                // If this line is the "old" next number or part of the sequence, bump it
                if (actualNum >= currentNum + 1) {
                    const newNum = actualNum + 1;
                    return `${newNum}. ${lineMatch[2]}`;
                }
            }
            return line;
        });

        const insert = `\n${nextNum}. `;
        const newTextAfter = updatedLinesAfter.join("\n");

        el.value = textBefore + insert + newTextAfter;

        // Put the cursor exactly after the new "X. "
        el.selectionStart = el.selectionEnd = start + insert.length;
    });
};
setupAutoNumbering("contentInput");
setupAutoNumbering("editContentInput");

// --- MODALS & FILTERS ---
const toggleModal = (modal, state) => { if(modal) modal.style.display = state ? "flex" : "none"; };
document.getElementById("openModalBtn").onclick = () => toggleModal(taskModal, true);
document.getElementById("closeModalBtn").onclick = () => toggleModal(taskModal, false);
document.getElementById("closeEditModalBtn").onclick = () => toggleModal(editModal, false);

const filterTabs = document.querySelector(".filter-tabs");

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelector(".filter-btn.active").classList.remove("active");
        btn.classList.add("active");

        currentFilter = btn.dataset.filter;

        // move slider
        if (currentFilter === "professional") {
            filterTabs.classList.add("professional");
        } else {
            filterTabs.classList.remove("professional");
        }

        document.getElementById("listTitle").innerText =
            `${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} Notes`;

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
        createdAt: Date.now(),
        color: "#ffffff",
        order: Date.now()
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

        tasks = tasks.filter(t => {
            const matchesCategory = t.category === currentFilter;
        
            const matchesSearch =
                t.title.toLowerCase().includes(searchQuery) ||
                t.content.toLowerCase().includes(searchQuery);
        
            return matchesCategory && matchesSearch;
        });
        
        // 👉 ADD THIS HERE
        document.getElementById("noteCount").innerText =
            `${tasks.length} Note${tasks.length !== 1 ? 's' : ''}`;

            tasks.sort((a, b) => {

                // 🧠 MY ORDER (drag & drop)
                if (sortMode === "myOrder") {
                    return (a.order ?? 0) - (b.order ?? 0);
                }
            
                // ⚡ LATEST
                if (sortMode === "latest") {
                    return b.createdAt - a.createdAt;
                }
            
                // ⚠️ URGENT FIRST
                if (sortMode === "urgent") {
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
            
                    if (a.priority !== b.priority) {
                        return a.priority === "urgent" ? -1 : 1;
                    }
            
                    return b.createdAt - a.createdAt;
                }
            
                // 📌 NONE (DEFAULT APP BEHAVIOR)
                return b.createdAt - a.createdAt;
            });

        tasks.forEach((data, index) => { // Added index here
            const li = document.createElement("li");
            const isUrgent = data.priority === 'urgent';
            li.className = `note-item ${data.completed ? 'note-completed' : ''} ${isUrgent ? 'note-urgent' : ''}`;
            const baseColor = data.color || "#ffffff";
            li.style.background = data.completed ? "#dcfce7" : baseColor;
            li.style.borderLeft = data.completed
                ? "5px solid #16a34a"
                : "5px solid transparent";
            li.classList.add("draggable-note");
            li.setAttribute("data-key", data.key);


          li.setAttribute("draggable", true);

li.addEventListener("dragstart", () => {
    draggedItem = li;
    li.style.opacity = "0.5";
});

li.addEventListener("dragend", () => {
    draggedItem = null;
    li.style.opacity = "1";
});

li.addEventListener("dragover", (e) => {
    e.preventDefault();
});

li.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === li) return;

    const allNotes = [...notesList.querySelectorAll(".note-item")];

    const fromIndex = allNotes.indexOf(draggedItem);
    const toIndex = allNotes.indexOf(li);

    if (fromIndex < toIndex) {
        li.after(draggedItem);
    } else {
        li.before(draggedItem);
    }

    updateOrderInFirebase();
});

    

            li.innerHTML = `
<div class="note-top">
  <div class="note-title">
    <span class="note-number">${index + 1}.</span> ${data.title} ${isUrgent ? '⚠️' : ''}
  </div>

  <div class="note-menu">
    <button class="menu-btn">⋮</button>
    <div class="menu-dropdown">
      <div class="done-option">${data.completed ? 'Undo' : 'Done'}</div>
      <div class="edit-option">Edit</div>
      <div class="delete-option">Delete</div>
      <div class="color-option">Color</div>
    </div>
  </div>
</div>

<div class="note-content">${data.content.replace(/\n/g, "<br>")}</div>

<span class="note-time">
  ${data.reminder ? '🔔 ' + new Date(data.reminder).toLocaleString() : 'No reminder'}
</span>
`;

            // Inside tasks.forEach in renderNotes
            const menuBtn = li.querySelector(".menu-btn");
            const dropdown = li.querySelector(".menu-dropdown");
            
            menuBtn.onclick = (e) => {
                e.stopPropagation();
            
                // remove active from all notes
                document.querySelectorAll(".note-item").forEach(n => {
                    n.classList.remove("active");
                });
            
                // bring this note to front
                li.classList.add("active");
            
                // close other dropdowns
                document.querySelectorAll(".menu-dropdown").forEach(d => {
                    if (d !== dropdown) d.classList.remove("show");
                });
            
                dropdown.classList.toggle("show");
            };
            // Updated all child paths to include userKey
            li.querySelector(".done-option").onclick = () =>
                update(ref(db, `users/${userKey}/notes/${data.key}`), {
                    completed: !data.completed
                });
            
            li.querySelector(".edit-option").onclick = () => {
                document.getElementById("editKey").value = data.key;
                document.getElementById("editTitleInput").value = data.title;
                document.getElementById("editContentInput").value = data.content;
            
                const editDateEl = document.getElementById("editReminderInput");
                if (editDateEl) editDateEl.value = data.reminder || "";
            
                document.getElementById("editPriorityInput").value = data.priority || "normal";
                document.getElementById("editCategoryInput").value = data.category || "personal";
            
                toggleModal(editModal, true);
            };
            
            li.querySelector(".delete-option").onclick = () => {
                if (confirm("Delete?")) {
                    remove(ref(db, `users/${userKey}/notes/${data.key}`));
                }
            };
            li.querySelector(".color-option").onclick = () => {
                const palette = ["#ffffff", "#fee2e2", "#dcfce7", "#dbeafe", "#fef9c3", "#f3e8ff"];
            
                let paletteDiv = document.createElement("div");
                paletteDiv.className = "color-palette";
            
                palette.forEach(color => {
                    let c = document.createElement("div");
                    c.style.background = color;
                    c.className = "color-circle";
            
                    c.onclick = () => {
                        if (data.completed) return; // block changes
                        update(ref(db, `users/${userKey}/notes/${data.key}`), {
                            color: color
                        });
                        paletteDiv.remove();
                    };
            
                    paletteDiv.appendChild(c);
                });
            
                li.appendChild(paletteDiv);
            };
            notesList.appendChild(li);
        });
    });
}

renderNotes();

function updateOrderInFirebase() {
    const items = [...notesList.querySelectorAll(".note-item")];

    items.forEach((item, index) => {
        const key = item.getAttribute("data-key");

        update(ref(db, `users/${userKey}/notes/${key}`), {
            order: index
        });
    });
}
document.getElementById("sidebarPdfBtn").onclick = () => {
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
document.getElementById("sidebarLogoutBtn").onclick = () => {
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