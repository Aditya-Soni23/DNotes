// --- ONE-TIME MIGRATION SCRIPT ---
import { get, child } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

async function migrateOldNotes() {
    const oldPath = ref(db, "DNotes");
    const targetPath = ref(db, "users/nandkumargurgaon_gmail_com/notes");

    try {
        const snapshot = await get(oldPath);
        if (snapshot.exists()) {
            const oldData = snapshot.val();
            
            // Loop through old notes and push them to the new location
            for (let key in oldData) {
                await push(targetPath, oldData[key]);
            }
            
            console.log("Migration successful! You can now delete the 'DNotes' node in Firebase console.");
            alert("Old notes have been moved to your account!");
        } else {
            console.log("No old notes found in DNotes.");
        }
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

// Uncomment the line below to run it ONCE, then comment it back or delete it.
// migrateOldNotes();