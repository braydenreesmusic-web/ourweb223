// script.js - Optimized, Functional, and Amazing

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
        background: var(--surface); color: var(--text); padding: 12px 24px; 
        border-radius: 50px; margin-bottom: 10px; box-shadow: var(--shadow);
        border: 1px solid var(--border); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;
        animation: slideIn 0.3s ease;
    `;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createFloatingHeart(x, y) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.textContent = '❤️';
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1000);
}

document.addEventListener('click', (e) => {
    // Add effect on buttons
    if(e.target.closest('button') || e.target.closest('.calendar-day')) {
        createFloatingHeart(e.clientX, e.clientY);
    }
});

function escapeHtml(str) {
    return !str ? '' : String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[m]);
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
        Object.values(data).forEach(p => {
            if(p.user === 'Brayden') document.getElementById('braydenPresence').classList.toggle('online', p.online);
            if(p.user === 'Youna') document.getElementById('younaPresence').classList.toggle('online', p.online);
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
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(queryTerm)}&media=music&limit=5`);
        const data = await res.json();
        resultsDiv.innerHTML = '';

        data.results.forEach(song => {
            const div = document.createElement('div');
            div.className = 'music-item';
            div.innerHTML = `
                <img src="${song.artworkUrl100}" alt="art">
                <div class="music-info">
                    <h4>${song.trackName}</h4>
                    <p>${song.artistName}</p>
                </div>
                <button class="btn icon-btn small">➕</button>
            `;
            // Add song to DB
            div.querySelector('button').onclick = async () => {
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
                showToast("Song added to Symphony");
            };
            resultsDiv.appendChild(div);
        });
    } catch(e) {
        resultsDiv.innerHTML = 'Error searching music.';
    }
});

function renderMusic() {
    const container = document.getElementById('savedMusic');
    onSnapshot(query(collections.music, orderBy('timestamp', 'desc')), snap => {
        container.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'card music-item';
            div.innerHTML = `
                <img src="${data.cover}" alt="art">
                <div class="music-info">
                    <h4>${data.title}</h4>
                    <p>${data.artist} • Added by ${data.user}</p>
                </div>
                <audio controls src="${data.preview}" style="height:30px; max-width:100px;"></audio>
            `;
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
                // Here we create a local URL for demo or use a base64 approach if small.
                // For reliability without storage config, we will simulate a "Voice Note" entry text.
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
    showToast("Inscribed.");
});

function renderNotes() {
    const list = document.getElementById('notesList');
    onSnapshot(query(collections.notes, orderBy('timestamp', 'desc')), snap => {
        list.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'card note-item';
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Just now';
            div.innerHTML = `
                <span class="note-date">${date} • ${data.user}</span>
                <p>${escapeHtml(data.content)}</p>
            `;
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
        
        snap.forEach(doc => {
            const data = doc.data();
            const evtDate = new Date(data.date);
            // Important: Match Month AND Year
            if(evtDate.getMonth() === date.getMonth() && evtDate.getFullYear() === date.getFullYear()) {
                // Find day element. Note: Calendar grid has empty offsets.
                // A simpler way is to iterate days and check text content.
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
        snap.forEach(doc => {
            const data = doc.data();
            // Only show future events ideally, but showing all for now
            const div = document.createElement('div');
            div.className = 'event-item';
            div.innerHTML = `
                <div><strong>${data.date}</strong>: ${escapeHtml(data.title)}</div>
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
        
        snap.forEach(doc => {
            const data = doc.data();
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
        snap.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : '';
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <span class="timeline-date">${date} • ${data.user}</span>
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
    e.target.classList.toggle('active');
    e.target.innerText = e.target.innerText === '🤍' ? '❤️' : '🤍';
    
    await addDoc(collections.favorites, {
        url, type,
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });
    showToast("Added to Sanctum");
    createFloatingHeart(e.clientX, e.clientY);
}

function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    onSnapshot(query(collections.favorites, orderBy('timestamp', 'desc')), snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'masonry-item';
            let content = '';
            if(data.type === 'photos') content = `<img src="${data.url}">`;
            else if(data.type === 'videos') content = `<video src="${data.url}" controls></video>`;
            
            div.innerHTML = `
                ${content}
                <div class="item-meta"><span>Saved by ${data.user}</span><span>❤️</span></div>
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
    onSnapshot(query(collections[type], orderBy('timestamp', 'desc'), limit(20)), snap => {
        container.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'masonry-item';
            const media = type === 'photos'
                ? `<img src="${data.url}" loading="lazy">`
                : `<video src="${data.url}" controls></video>`;
            
            div.innerHTML = `
                ${media}
                <div class="item-meta">
                    <span>${data.user}</span>
                    <button class="btn icon-btn fav-btn">🤍</button>
                </div>
            `;
            
            div.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e, data.url, type);
            if(type === 'photos') {
                div.querySelector('img').onclick = () => {
                    const box = document.getElementById('lightbox');
                    box.classList.add('active');
                    box.querySelector('.lightbox-media-container').innerHTML = `<img src="${data.url}">`;
                };
            }
            container.appendChild(div);
        });
    });
}

/* ================= INIT ================= */
function initApp() {
    updateTimeTogether();
    renderGallery('photos');
    renderGallery('videos');
    renderNotes();
    renderMusic();
    renderTimeline();
    
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
    document.getElementById('lightbox').classList.remove('active');
});
