// script.js - Optimized, Functional, and Amazing (updated fixes)
// - Improved lightbox (click backdrop or ESC to close)
// - Removed floating-heart effect
// - Favorites rendering bug fixed + show favorites tab
// - Removed heart click animation behavior
// - Delete songs & delete notes implemented
// - "Open" option for songs (Spotify / Deezer)

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
        // Reset both presence dots
        const bDot = document.getElementById('braydenPresence');
        const yDot = document.getElementById('younaPresence');
        if(bDot) bDot.classList.remove('online');
        if(yDot) yDot.classList.remove('online');

        Object.values(data).forEach(p => {
            if(p.user === 'Brayden' && bDot) bDot.classList.toggle('online', p.online);
            if(p.user === 'Youna' && yDot) yDot.classList.toggle('online', p.online);
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
                    <button class="btn small" data-id="${id}" data-action="open">Open</button>
                    <button class="btn ghost small" data-id="${id}" data-action="delete">Delete</button>
                </div>
            `;
            // Open (Spotify/Deezer)
            div.querySelector('button[data-action="open"]').addEventListener('click', () => {
                showSongOpenMenu(data.title, data.artist);
            });
            div.querySelector('button[data-action="delete"]').addEventListener('click', async () => {
                const ok = confirm(`Delete "${data.title}"?`);
                if(!ok) return;
                try {
                    await deleteDoc(doc(db, 'music', id));
                    showToast("Song removed", "success");
                    addToTimeline(`Removed song: ${data.title}`);
                } catch(e) {
                    console.error(e);
                    showToast("Delete failed", "error");
                }
            });
            container.appendChild(div);
        });
    });
}

function showSongOpenMenu(title, artist) {
    // Simple confirm-based menu: open Spotify or Deezer
    const choice = prompt('Open in: type "spotify" or "deezer" (or cancel)');
    if(!choice) return;
    const q = `${title} ${artist}`;
    if(choice.toLowerCase().includes('spotify')) {
        const url = `https://open.spotify.com/search/${encodeURIComponent(q)}`;
        window.open(url, '_blank');
    } else if(choice.toLowerCase().includes('deezer')) {
        const url = `https://www.deezer.com/search/${encodeURIComponent(q)}`;
        window.open(url, '_blank');
    } else {
        showToast('Unknown choice. Type "spotify" or "deezer".');
    }
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
                    <button class="btn ghost small" data-id="${id}" aria-label="Delete note">Delete</button>
                </div>
                <p>${escapeHtml(data.content)}</p>
            `;
            div.querySelector('button')?.addEventListener('click', async (e) => {
                const ok = confirm('Delete this note?');
                if(!ok) return;
                try {
                    await deleteDoc(doc(db, 'notes', id));
                    showToast('Note deleted', 'success');
                    addToTimeline('Removed a note');
                } catch(err) {
                    console.error(err);
                    showToast('Could not delete note', 'error');
                }
            });
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
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstance);
        renderMapPoints();
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

// Favorites
async function toggleFavorite(e, url, type) {
    e.stopPropagation();
    // simplified: just save favorite entry, no heart animation / toggle
    try {
        await addDoc(collections.favorites, {
            url, type,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
        showToast("Added to Favorites");
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
            const div = document.createElement('div');
            div.className = 'masonry-item';
            let content = '';
            if(data.type === 'photos') content = `<img src="${escapeHtml(data.url)}" loading="lazy">`;
            else if(data.type === 'videos') content = `<video src="${escapeHtml(data.url)}" controls></video>`;
            else content = `<a href="${escapeHtml(data.url)}" target="_blank">Open</a>`;

            div.innerHTML = `
                ${content}
                <div class="item-meta">
                    <span>Saved by ${escapeHtml(data.user)}</span>
                </div>
            `;
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
    renderFavorites(); // <--- fixed: ensure favorites are rendered
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
