// script.js - Optimized, Functional, and Amazing (updated fixes)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, limit
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCg4ff72caOr1rk9y7kZAkUbcyjqfPuMLI",
  authDomain: "ourwebsite223.firebaseapp.com",
  projectId: "ourwebsite223",
  storageBucket: "ourwebsite223.appspot.com",
  messagingSenderId: "978864749848",
  appId: "1:978864749848:web:f1e635f87e2ddcc007f26d",
  measurementId: "G-823MYFCCMG"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const rtdb = getDatabase(app);

const collections = {
  photos: collection(db, "photos"),
  videos: collection(db, "videos"),
  music: collection(db, "music"),
  notes: collection(db, "notes"),
  events: collection(db, "events"),
  timeline: collection(db, "timeline"),
  favorites: collection(db, "favorites"),
  memories: collection(db, "memories")
};

const USER_MAP = { 'brayden@love.com': 'Brayden', 'youna@love.com': 'Youna' };
const USERS = { brayden: 'brayden@love.com', youna: 'youna@love.com' };
const START_DATE = new Date("2024-05-09T00:00:00");

let currentUser = null;
let mapInstance = null;
let memoryMarkers = [];
let mediaMarkers = [];
let currentCalDate = new Date();
let mediaRecorder = null;
let audioChunks = [];

/* ================= UI HELPERS ================= */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: var(--surface); color: var(--text); padding: 12px 18px; 
        border-radius: 28px; margin-bottom: 10px; box-shadow: var(--shadow);
        border: 1px solid var(--border); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;
        animation: slideIn 0.25s ease;
    `;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span style="font-size:16px">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2600);
}

function escapeHtml(str) {
    return !str ? '' : String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' })[m]);
}

function updateTimeTogether() {
    const counter = document.getElementById('daysCounter');
    if(!counter) return;
    
    const now = new Date();
    const diff = now - START_DATE;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    
    counter.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s Together`;
}
setInterval(updateTimeTogether, 1000);

/* ================= AUTH & STARTUP ================= */
const authModal = document.getElementById("authModal");
const braydenLogin = document.getElementById("braydenLogin");
const younaLogin = document.getElementById("younaLogin");
const authEmail = document.getElementById("authEmail");

// Default Selection
if(braydenLogin && younaLogin && authEmail) {
    authEmail.value = USERS.brayden;
    braydenLogin.addEventListener("click", () => {
        braydenLogin.classList.add('active');
        younaLogin.classList.remove('active');
        authEmail.value = USERS.brayden;
    });
    younaLogin.addEventListener("click", () => {
        younaLogin.classList.add('active');
        braydenLogin.classList.remove('active');
        authEmail.value = USERS.youna;
    });
}

document.getElementById("signInBtn")?.addEventListener("click", async () => {
    try {
        const pass = document.getElementById("authPassword").value;
        await signInWithEmailAndPassword(auth, authEmail.value, pass);
        showToast("Welcome home.", "success");
    } catch (e) {
        console.error(e);
        showToast("Incorrect vow.", "error");
    }
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    if (currentUser) {
        await set(ref(rtdb, `presence/${currentUser.uid}`), { online: false, timestamp: Date.now() });
    }
    await signOut(auth);
});

onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
        authModal.classList.remove("active");
        setupPresence(user);
        initApp();
    } else {
        authModal.classList.add("active");
    }
});

function setupPresence(user) {
    const userRef = ref(rtdb, `presence/${user.uid}`);
    const userName = USER_MAP[user.email];
    set(userRef, { online: true, user: userName });
    onDisconnect(userRef).set({ online: false, user: userName });
    
    onValue(ref(rtdb, 'presence'), snap => {
        const data = snap.val() || {};
        // Reset both presence dots and text
        const bDot = document.getElementById('braydenPresence');
        const yDot = document.getElementById('younaPresence');
        const bText = document.getElementById('braydenPresenceText');
        const yText = document.getElementById('younaPresenceText');
        
        if(bDot) bDot.classList.remove('online');
        if(yDot) yDot.classList.remove('online');
        if(bText) bText.textContent = 'Brayden Offline';
        if(yText) yText.textContent = 'Youna Offline';

        Object.values(data).forEach(p => {
            if(p.user === 'Brayden' && bDot) {
                bDot.classList.toggle('online', p.online);
                if(bText) bText.textContent = p.online ? 'Brayden Online' : 'Brayden Offline';
            }
            if(p.user === 'Youna' && yDot) {
                yDot.classList.toggle('online', p.online);
                if(yText) yText.textContent = p.online ? 'Youna Online' : 'Youna Offline';
            }
        });
    });
}

/* ================= NAVIGATION ================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
        
        btn.classList.add("active");
        const sectionId = btn.dataset.section;
        const section = document.getElementById(sectionId);
        section.classList.add("active");
        
        // Special Handling
        if (sectionId === "mapSection") {
            setTimeout(initMap, 100); // Small delay for transition
        }
        if (sectionId === "schedule") renderCalendar(currentCalDate);
    });
});

/* ================= CONTEXT MENU SIMULATION (Delete/Edit) ================= */
let pressTimer = null;
const CONTEXT_MENU_DURATION = 700; // ms to simulate long press

function attachLongPressListener(element, docId, collectionName, title, renderFunction) {
    let contextMenu = null;
    
    // Prevent default right-click context menu
    element.addEventListener('contextmenu', (e) => e.preventDefault());

    const showMenu = (e) => {
        // Prevent showing multiple menus
        document.querySelectorAll('.context-menu').forEach(m => m.remove());
        
        contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn small error';
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.color = 'var(--error)';
        deleteBtn.onclick = async () => {
            const ok = confirm(`Delete "${title}"?`);
            if(!ok) return;
            try {
                await deleteDoc(doc(db, collectionName, docId));
                showToast(`"${title}" removed`, "success");
                addToTimeline(`Removed item from ${collectionName}`);
                if(renderFunction) renderFunction(); // Re-render if provided
            } catch(e) {
                console.error(e);
                showToast("Delete failed", "error");
            }
            contextMenu.remove();
        };

        const editBtn = document.createElement('button');
        editBtn.className = 'btn small ghost';
        editBtn.textContent = 'Edit (Click to log)';
        editBtn.onclick = () => {
             // In a real app, this would open an edit form
            showToast(`Editing "${title}"... (Simulated/Logged)`);
            addToTimeline(`Edited item in ${collectionName}`); // Log the edit
            contextMenu.remove();
        };

        contextMenu.appendChild(editBtn);
        contextMenu.appendChild(deleteBtn);
        element.appendChild(contextMenu);
        
        // Auto-hide menu after a short time or on click outside
        const hideMenu = (e) => {
            if(contextMenu && !contextMenu.contains(e.target) && e.target !== element) {
                contextMenu.remove();
                document.removeEventListener('click', hideMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', hideMenu), 50);
    };

    const startPress = (e) => {
        e.preventDefault();
        pressTimer = setTimeout(() => showMenu(e), CONTEXT_MENU_DURATION);
    };
    
    const endPress = () => clearTimeout(pressTimer);

    // Attach listeners to the options button (or its container)
    const trigger = element.querySelector('.delete-note-trigger, .fav-options-trigger');
    if (trigger) {
        // Desktop listeners
        trigger.addEventListener('mousedown', startPress);
        trigger.addEventListener('mouseup', endPress);
        trigger.addEventListener('mouseleave', endPress);
        
        // Mobile listeners
        trigger.addEventListener('touchstart', startPress);
        trigger.addEventListener('touchend', endPress);
    }
}


/* ================= MUSIC OPTIONS - NEW ACTION SHEET LOGIC ================= */

function openSongLink(title, artist, service) {
    const q = `${title} ${artist}`;
    let url = '';
    if(service === 'spotify') {
        // Placeholder URL construction
        url = `http://googleusercontent.com/spotify.com/search?q=${encodeURIComponent(q)}`;
    } else if(service === 'deezer') {
        url = `https://www.deezer.com/search/${encodeURIComponent(q)}`;
    }
    if (url) {
        window.open(url, '_blank');
        showToast(`Opening on ${service.charAt(0).toUpperCase() + service.slice(1)}`);
    }
}

function attachMusicOptionsListener(element, docId, data) {
    let pressTimer = null;
    const CONTEXT_MENU_DURATION = 700;

    // Prevent default right-click context menu
    element.addEventListener('contextmenu', (e) => e.preventDefault());

    const showMenu = () => {
        // Remove any previous action sheets
        document.querySelectorAll('.action-sheet-backdrop').forEach(m => m.remove());
        
        // Create Action Sheet Backdrop (Modal)
        const backdrop = document.createElement('div');
        backdrop.className = 'action-sheet-backdrop active';
        
        const actionSheet = document.createElement('div');
        actionSheet.className = 'action-sheet-content';

        // Helper to create buttons
        const createActionButton = (text, type, action, icon) => {
            const btn = document.createElement('button');
            btn.className = `action-sheet-btn ${type}`;
            btn.innerHTML = `${icon ? `<span class="icon">${icon}</span>` : ''}<span>${text}</span>`;
            btn.onclick = (e) => {
                e.stopPropagation();
                action();
                backdrop.classList.remove('active');
                setTimeout(() => backdrop.remove(), 300);
            };
            return btn;
        };

        const deleteAction = async () => {
            const ok = confirm(`Delete "${data.title}"?`);
            if(!ok) return;
            try {
                await deleteDoc(doc(db, 'music', docId));
                showToast(`"${data.title}" removed`, "success");
                addToTimeline(`Removed song: ${data.title}`);
                renderMusic();
            } catch(e) {
                console.error(e);
                showToast("Delete failed", "error");
            }
        };
        
        const playlistAction = () => {
             showToast(`Added "${data.title}" to Playlist (Simulated)`);
             addToTimeline(`Added song "${data.title}" to a playlist`);
        };

        const spotifyAction = () => openSongLink(data.title, data.artist, 'spotify');
        const deezerAction = () => openSongLink(data.title, data.artist, 'deezer');
        
        // Menu structure
        const menuBlock = document.createElement('div');
        menuBlock.className = 'action-sheet-block';
        menuBlock.appendChild(createActionButton('Open in Spotify', 'default', spotifyAction, '🎧'));
        menuBlock.appendChild(createActionButton('Open in Deezer', 'default', deezerAction, '🎧'));
        
        const playlistBlock = document.createElement('div');
        playlistBlock.className = 'action-sheet-block';
        playlistBlock.appendChild(createActionButton('Add to Playlist', 'default', playlistAction, '➕'));
        
        const deleteBlock = document.createElement('div');
        deleteBlock.className = 'action-sheet-block';
        deleteBlock.appendChild(createActionButton('Delete Song', 'destructive', deleteAction, '🗑️'));
        
        const cancelBlock = document.createElement('div');
        cancelBlock.className = 'action-sheet-block';
        cancelBlock.appendChild(createActionButton('Cancel', 'cancel', () => backdrop.classList.remove('active'), ''));

        actionSheet.appendChild(menuBlock);
        actionSheet.appendChild(playlistBlock);
        actionSheet.appendChild(deleteBlock);
        actionSheet.appendChild(cancelBlock);

        backdrop.appendChild(actionSheet);
        document.body.appendChild(backdrop);
        
        // Click backdrop to close
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                backdrop.classList.remove('active');
                setTimeout(() => backdrop.remove(), 300);
            }
        };
    };

    const startPress = (e) => {
        // Only trigger on the options button itself
        if(!e.target.closest('.music-options-trigger')) return;

        e.preventDefault();
        // Clear any previous timer
        clearTimeout(pressTimer);
        pressTimer = setTimeout(showMenu, CONTEXT_MENU_DURATION);
    };
    
    const endPress = () => clearTimeout(pressTimer);

    // Attach listeners to the options button (or its container)
    const trigger = element.querySelector('.music-options-trigger');
    if (trigger) {
        // Desktop listeners
        trigger.addEventListener('mousedown', startPress);
        trigger.addEventListener('mouseup', endPress);
        trigger.addEventListener('mouseleave', endPress);
        
        // Mobile listeners
        trigger.addEventListener('touchstart', startPress);
        trigger.addEventListener('touchend', endPress);
        // Also allow simple click for immediate menu open on non-touch devices or for accessibility
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            // Only show if no long press timer is running or if we're certain it's a simple click
            if (!pressTimer) showMenu();
        });
    }
}

/* ================= MUSIC LOGIC (ITUNES API) ================= */
document.getElementById('addMusicBtn')?.addEventListener('click', async () => {
    const queryTerm = document.getElementById('musicInput').value;
    if(!queryTerm) return;
    
    const resultsDiv = document.getElementById('musicSearchResults');
    resultsDiv.innerHTML = '<div style="text-align:center; padding:10px;">Searching...</div>';
    resultsDiv.classList.remove('hidden');

    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(queryTerm)}&media=music&limit=8`);
        const data = await res.json();
        resultsDiv.innerHTML = '';

        data.results.forEach(song => {
            const div = document.createElement('div');
            div.className = 'music-item';
            div.innerHTML = `
                <img src="${song.artworkUrl100}" alt="art">
                <div class="music-info">
                    <h4>${escapeHtml(song.trackName)}</h4>
                    <p>${escapeHtml(song.artistName)}</p>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="btn small">Save</button>
                </div>
            `;
            // Add song to DB
            div.querySelector('button') .onclick = async () => {
                await addDoc(collections.music, {
                    title: song.trackName,
                    artist: song.artistName,
                    cover: song.artworkUrl100,
                    preview: song.previewUrl,
                    user: USER_MAP[currentUser.email],
                    timestamp: serverTimestamp()
                });
                resultsDiv.classList.add('hidden');
                document.getElementById('musicInput').value = '';
                addToTimeline(`Added song: ${song.trackName}`);
                showToast("Song added to Music");
            };
            resultsDiv.appendChild(div);
        });
    } catch(e) {
        console.error(e);
        resultsDiv.innerHTML = 'Error searching music.';
    }
});

function renderMusic() {
    const container = document.getElementById('savedMusic');
    onSnapshot(query(collections.music, orderBy('timestamp', 'desc')), snap => {
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'card music-item';
            div.innerHTML = `
                <img src="${data.cover}" alt="art">
                <div class="music-info">
                    <h4>${escapeHtml(data.title)}</h4>
                    <p>${escapeHtml(data.artist)} • Added by ${escapeHtml(data.user)}</p>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <audio controls src="${data.preview}" style="height:30px; max-width:140px;"></audio>
                    <div style="width:40px; height:40px; text-align:center; display:flex; justify-content:center; align-items:center;">
                        <button class="btn icon-btn small music-options-trigger" data-id="${id}" aria-label="Options">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                    </div>
                </div>
            `;
            
            // NEW: Attach long-press/click listener for the action sheet
            attachMusicOptionsListener(div, id, data);

            container.appendChild(div);
        });
    });
}

/* ================= NOTES & VOICE ================= */
// Voice Recording
const voiceBtn = document.getElementById('voiceNoteBtn');
const voiceStatus = document.getElementById('voiceStatus');

voiceBtn?.addEventListener('click', async () => {
    if(!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                // In a real app, upload Blob to Storage (Firebase/Cloudinary).
                // Here we create a local entry as placeholder
                await addDoc(collections.notes, {
                    content: "🎤 Voice Note (Audio support needs Storage bucket enabled)",
                    type: 'voice',
                    user: USER_MAP[currentUser.email],
                    timestamp: serverTimestamp()
                });
                voiceStatus.classList.add('hidden');
                showToast("Voice note saved");
            };
            
            mediaRecorder.start();
            voiceStatus.classList.remove('hidden');
            voiceBtn.classList.add('active'); // Visual indicator
        } catch(e) {
            showToast("Microphone access denied", "error");
        }
    } else {
        mediaRecorder.stop();
        voiceBtn.classList.remove('active');
    }
});

document.getElementById('saveNoteBtn')?.addEventListener('click', async () => {
    const txt = document.getElementById('noteInput').value;
    if(!txt) return;
    await addDoc(collections.notes, {
        content: txt,
        type: 'text',
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });
    document.getElementById('noteInput').value = '';
    addToTimeline("Left a note");
    showToast("Saved.");
});

function renderNotes() {
    const list = document.getElementById('notesList');
    onSnapshot(query(collections.notes, orderBy('timestamp', 'desc')), snap => {
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'card note-item';
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Just now';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <span class="note-date">${escapeHtml(date)} • ${escapeHtml(data.user)}</span>
                    <button class="btn ghost small delete-note-trigger" data-id="${id}" aria-label="Options">... </button>
                </div>
                <p>${escapeHtml(data.content)}</p>
            `;
            
            // Long-press trigger for Delete/Edit
            attachLongPressListener(
                div.querySelector('.delete-note-trigger').parentElement, // Attach to the container div
                id, 'notes', data.content.substring(0, 30) + '...', renderNotes
            );

            list.appendChild(div);
        });
    });
}

/* ================= CALENDAR ================= */
function renderCalendar(date) {
    const grid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('monthYear');
    if(!grid) return;
    grid.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    monthYear.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for(let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    
    for(let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = d;
        
        const today = new Date();
        if(d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        
        dayEl.addEventListener('click', () => {
            document.getElementById('eventDate').value = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            document.getElementById('eventForm').classList.remove('hidden');
        });
        
        grid.appendChild(dayEl);
    }
    loadEventsForMonth(date);
}

// Event Listeners for Calendar
document.getElementById('prevMonth')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar(currentCalDate);
});
document.getElementById('nextMonth')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar(currentCalDate);
});
document.getElementById('addEventToggleBtn')?.addEventListener('click', () => document.getElementById('eventForm').classList.toggle('hidden'));
document.getElementById('cancelEventBtn')?.addEventListener('click', () => document.getElementById('eventForm').classList.add('hidden'));

document.getElementById('saveEventBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    if(title && date) {
        await addDoc(collections.events, { title, date, user: USER_MAP[currentUser.email], timestamp: serverTimestamp() });
        document.getElementById('eventForm').classList.add('hidden');
        document.getElementById('eventTitle').value = '';
        renderCalendar(currentCalDate);
        showToast("Event saved");
        addToTimeline(`New Plan: ${title}`);
    }
});

function loadEventsForMonth(date) {
    // Simple fetch all for demo scale
    onSnapshot(collections.events, snap => {
        const days = document.querySelectorAll('.calendar-day');
        // Reset dots
        days.forEach(d => d.classList.remove('has-event'));
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const evtDate = new Date(data.date);
            // Important: Match Month AND Year
            if(evtDate.getMonth() === date.getMonth() && evtDate.getFullYear() === date.getFullYear()) {
                days.forEach(dayEl => {
                    if(parseInt(dayEl.textContent) === evtDate.getDate()) {
                        dayEl.classList.add('has-event');
                    }
                });
            }
        });
        renderEventsList();
    });
}

function renderEventsList() {
    const list = document.getElementById('eventsList');
    // Order by date ascending
    onSnapshot(query(collections.events, orderBy('date', 'asc'), limit(5)), snap => {
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'event-item';
            div.innerHTML = `
                <div><strong>${escapeHtml(data.date)}</strong>: ${escapeHtml(data.title)}</div>
            `;
            list.appendChild(div);
        });
    });
}

/* ================= MAP ================= */
function initMap() {
    const container = document.getElementById('mapContainer');
    if (!container) return;
    
    if (!mapInstance) {
        mapInstance = L.map('mapContainer').setView([34.0522, -118.2437], 10);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);
        renderMapPoints();
        renderMediaLocations(); // NEW: Render media markers
    } else {
        // Fix for gray map when hidden
        mapInstance.invalidateSize();
    }
}

function renderMapPoints() {
    onSnapshot(collections.memories, snap => {
        // Clear existing markers
        memoryMarkers.forEach(m => mapInstance.removeLayer(m));
        memoryMarkers = [];
        const list = document.getElementById('memoriesList');
        list.innerHTML = '';
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const marker = L.marker([data.lat, data.lng]).addTo(mapInstance)
                .bindPopup(`<b>${escapeHtml(data.title)}</b><br>${escapeHtml(data.desc)}`);
            memoryMarkers.push(marker);
            
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${escapeHtml(data.title)}</strong>
                    <button class="btn icon-btn small">✈️</button>
                </div>
                <p style="font-size:0.9rem; margin:4px 0;">${escapeHtml(data.desc)}</p>
            `;
            div.querySelector('button').onclick = () => {
                mapInstance.flyTo([data.lat, data.lng], 15);
                marker.openPopup();
                document.getElementById('mapContainer').scrollIntoView({behavior:'smooth'});
            };
            list.appendChild(div);
        });
    });
}

// Simulate fetching media with geo-metadata
function getMediaWithLocation(snap) {
    const locations = [];
    snap.forEach(docSnap => {
        const data = docSnap.data();
        // Simulate Geo-metadata check
        const hasLocation = data.url.includes('cloudinary'); // Simple placeholder
        
        if (hasLocation) {
            // Simulated location data based on user
            let lat = data.user === 'Brayden' ? 34.00 + Math.random() * 0.1 : 33.95 + Math.random() * 0.1;
            let lng = data.user === 'Brayden' ? -118.20 + Math.random() * 0.1 : -118.30 + Math.random() * 0.1;

            locations.push({
                title: `${data.type.slice(0,-1)} by ${data.user}`,
                lat, lng,
                url: data.url,
                type: data.type
            });
        }
    });
    return locations;
}

function renderMediaLocations() {
    onSnapshot(collections.photos, snapPhotos => {
        onSnapshot(collections.videos, snapVideos => {
            // Clear existing media markers
            mediaMarkers.forEach(m => mapInstance.removeLayer(m));
            mediaMarkers = [];

            const photoLocations = getMediaWithLocation(snapPhotos);
            const videoLocations = getMediaWithLocation(snapVideos);
            const allMediaLocations = [...photoLocations, ...videoLocations];
            
            allMediaLocations.forEach(loc => {
                // Different color/icon based on media type
                const colorCode = loc.type === 'photos' ? '#C38D9E' : '#E8DFF5';
                const iconHtml = loc.type === 'photos' ? '📸' : '📹';

                const icon = L.divIcon({
                    className: 'media-marker-icon',
                    html: `<span style="color:${colorCode}; font-size: 20px;">${iconHtml}</span>`,
                    iconSize: [20, 20]
                });

                const marker = L.marker([loc.lat, loc.lng], { icon: icon }).addTo(mapInstance)
                    .bindPopup(`
                        <b>${escapeHtml(loc.title)}</b><br>
                        <a href="${loc.url}" target="_blank">View Media</a>
                    `);
                mediaMarkers.push(marker);
            });
        });
    });
}

document.getElementById('addMemoryBtn')?.addEventListener('click', () => document.getElementById('memoryModal').classList.add('active'));
document.getElementById('cancelMemoryBtn')?.addEventListener('click', () => document.getElementById('memoryModal').classList.remove('active'));
document.getElementById('getCurrentLocation')?.addEventListener('click', () => {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('latInput').value = pos.coords.latitude;
            document.getElementById('lngInput').value = pos.coords.longitude;
        });
    }
});
document.getElementById('saveMemoryBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('memoryTitle').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    if(title && lat && lng) {
        await addDoc(collections.memories, {
            title, lat, lng, desc: document.getElementById('memoryDesc').value,
            user: USER_MAP[currentUser.email], timestamp: serverTimestamp()
        });
        document.getElementById('memoryModal').classList.remove('active');
        showToast("Memory pinned!");
        addToTimeline(`Pinned location: ${title}`);
    }
});

/* ================= TIMELINE & FAVORITES ================= */
function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    onSnapshot(query(collections.timeline, orderBy('timestamp', 'desc'), limit(30)), snap => {
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : '';
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <span class="timeline-date">${escapeHtml(date)} • ${escapeHtml(data.user)}</span>
                    <p class="timeline-text">${escapeHtml(data.action)}</p>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

async function addToTimeline(action) {
    if(!currentUser) return;
    try {
        await addDoc(collections.timeline, {
            action, user: USER_MAP[currentUser.email], timestamp: serverTimestamp()
        });
    } catch(e) { console.error("Timeline error", e); }
}

// Favorites (toggleFavorite is now simplified for ADDING only)
async function toggleFavorite(e, url, type) {
    e.stopPropagation();
    try {
        await addDoc(collections.favorites, {
            url, type,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
        showToast("Added to Favorites");
        addToTimeline(`Faved a ${type.slice(0,-1)}`);
    } catch(err) {
        console.error(err);
        showToast("Could not add favorite", "error");
    }
}

function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    onSnapshot(query(collections.favorites, orderBy('timestamp', 'desc'), limit(50)), snap => {
        grid.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'masonry-item';

            let content = '';
            let title = '';
            if(data.type === 'photos') {
                content = `<img src="${escapeHtml(data.url)}" loading="lazy">`;
                title = 'Photo';
            } else if(data.type === 'videos') {
                content = `<video src="${escapeHtml(data.url)}" controls></video>`;
                title = 'Video';
            } else {
                content = `<a href="${escapeHtml(data.url)}" target="_blank">Open Link</a>`;
                title = 'Link';
            }

            div.innerHTML = `
                ${content}
                <div class="item-meta">
                    <span>Saved by ${escapeHtml(data.user)}</span>
                    <button class="btn icon-btn small fav-options-trigger" data-id="${id}" aria-label="Options">... </button>
                </div>
            `;
            
            // Long-press trigger for Delete/Edit
            attachLongPressListener(
                div.querySelector('.fav-options-trigger').parentElement,
                id, 'favorites', `${title} from ${escapeHtml(data.user)}`, renderFavorites
            );
            
            grid.appendChild(div);
        });
    });
}

/* ================= MEDIA UPLOAD (Cloudinary) ================= */
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "unsigned_upload";

async function handleUpload(files, type) {
    if(!files.length) return;
    showToast("Uploading to cloud...");
    const bar = document.getElementById(type === 'photos' ? 'photoProgress' : 'videoProgress');
    
    for (let file of files) {
        const fd = new FormData();
        fd.append("upload_preset", UPLOAD_PRESET);
        fd.append("file", file);
        
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            
            if(data.error) throw new Error(data.error.message);
            
            bar.style.width = '100%';
            
            await addDoc(collections[type], {
                url: data.secure_url, type,
                user: USER_MAP[currentUser.email], timestamp: serverTimestamp()
            });
            addToTimeline(`Uploaded a ${type.slice(0,-1)}`);
        } catch(e) {
            console.error(e);
            showToast("Upload failed. Check Cloudinary settings.", "error");
        }
    }
    setTimeout(() => bar.style.width = '0%', 1000);
    showToast("Upload complete!", "success");
}

document.getElementById('photoInput')?.addEventListener('change', e => handleUpload(e.target.files, 'photos'));
document.getElementById('videoInput')?.addEventListener('change', e => handleUpload(e.target.files, 'videos'));

function renderGallery(type) {
    const container = document.getElementById(type === 'photos' ? 'photoGallery' : 'videoGallery');
    onSnapshot(query(collections[type], orderBy('timestamp', 'desc'), limit(50)), snap => {
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'masonry-item';
            const media = type === 'photos'
                ? `<img src="${escapeHtml(data.url)}" loading="lazy" data-url="${escapeHtml(data.url)}" alt="photo">`
                : `<video src="${escapeHtml(data.url)}" controls></video>`;
            
            div.innerHTML = `
                ${media}
                <div class="item-meta">
                    <span>${escapeHtml(data.user)}</span>
                    <button class="btn small fav-btn" data-url="${escapeHtml(data.url)}" data-type="${type}">Save</button>
                </div>
            `;
            
            div.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e, data.url, type);
            if(type === 'photos') {
                const img = div.querySelector('img');
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', () => {
                    openLightbox({ type: 'image', src: img.dataset.url, caption: `${escapeHtml(data.user)}` });
                });
            }
            container.appendChild(div);
        });
    });
}

/* ================= LIGHTBOX (improved) ================= */
const lightbox = document.getElementById('lightbox');
const lightboxContainer = lightbox?.querySelector('.lightbox-media-container');
const lightboxCaption = lightbox?.querySelector('.lightbox-caption');
const lightboxClose = lightbox?.querySelector('.close-lightbox');

function openLightbox({ type, src, caption = '' }) {
    if(!lightbox || !lightboxContainer) return;
    lightboxContainer.innerHTML = '';
    if(type === 'image') {
        const img = document.createElement('img');
        img.src = src;
        img.alt = caption || 'photo';
        img.style.maxHeight = '80vh';
        img.style.maxWidth = '90vw';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        lightboxContainer.appendChild(img);
    } else if(type === 'video') {
        const v = document.createElement('video');
        v.src = src;
        v.controls = true;
        v.style.maxHeight = '80vh';
        v.style.maxWidth = '90vw';
        v.style.display = 'block';
        v.style.margin = '0 auto';
        lightboxContainer.appendChild(v);
    }
    lightboxCaption.textContent = caption;
    lightbox.classList.add('active');
    // trap scroll
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    if(!lightbox) return;
    lightbox.classList.remove('active');
    lightboxContainer.innerHTML = '';
    lightboxCaption.textContent = '';
    document.body.style.overflow = '';
}

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.querySelector('.lightbox-backdrop')?.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeLightbox(); });

/* ================= INIT ================= */
function initApp() {
    updateTimeTogether();
    renderGallery('photos');
    renderGallery('videos');
    renderNotes();
    renderMusic();
    renderTimeline();
    renderFavorites();
    // Theme
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('darkModeToggle').checked = true;
    }
}

document.getElementById('darkModeToggle')?.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
});

document.querySelector('.close-lightbox')?.addEventListener('click', () => {
    closeLightbox();
});
