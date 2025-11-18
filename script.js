// script.js - Fully Functional: Calendar, Map, Timeline, Favorites

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, where, limit
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
const START_DATE = new Date("2024-05-09"); // Set your real date here

let currentUser = null;
let currentSection = "photos";
let mapInstance = null;
let memoryMarkers = [];

// Calendar State
let currentCalDate = new Date();

/* ================= UI HELPERS ================= */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  return !str ? '' : String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[m]);
}

function updateDaysCounter() {
  const diff = Date.now() - START_DATE.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  document.getElementById('daysCounter').textContent = `DAY ${days} TOGETHER`;
}

/* ================= AUTH ================= */
const authModal = document.getElementById("authModal");
const braydenLogin = document.getElementById("braydenLogin");
const younaLogin = document.getElementById("younaLogin");
const authEmail = document.getElementById("authEmail");

braydenLogin.addEventListener("click", () => { braydenLogin.classList.add('active'); younaLogin.classList.remove('active'); authEmail.value = USERS.brayden; });
younaLogin.addEventListener("click", () => { younaLogin.classList.add('active'); braydenLogin.classList.remove('active'); authEmail.value = USERS.youna; });

document.getElementById("signInBtn").addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, authEmail.value, document.getElementById("authPassword").value);
    authModal.classList.remove("active");
    showToast("Welcome home.", "success");
  } catch (e) { showToast("Login failed.", "error"); }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (currentUser) set(ref(rtdb, `presence/${currentUser.uid}`), { online: false, timestamp: Date.now() });
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
  set(userRef, { online: true, user: USER_MAP[user.email] });
  onDisconnect(userRef).set({ online: false, user: USER_MAP[user.email] });
  
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
    document.getElementById(sectionId).classList.add("active");
    currentSection = sectionId;
    
    if (sectionId === "mapSection") setTimeout(initMap, 200);
    if (sectionId === "schedule") renderCalendar(currentCalDate);
    if (sectionId === "favorites") renderFavorites();
    if (sectionId === "timeline") renderTimeline();
  });
});

/* ================= CALENDAR LOGIC (FIXED) ================= */
function renderCalendar(date) {
    const grid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('monthYear');
    grid.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    monthYear.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Empty slots
    for(let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    // Days
    for(let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = d;
        
        // Highlight today
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

document.getElementById('prevMonth').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar(currentCalDate);
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar(currentCalDate);
});

document.getElementById('addEventToggleBtn').addEventListener('click', () => {
    document.getElementById('eventForm').classList.toggle('hidden');
});

document.getElementById('saveEventBtn').addEventListener('click', async () => {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    if(!title || !date) return;
    
    await addDoc(collections.events, {
        title, date,
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });
    
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventForm').classList.add('hidden');
    renderCalendar(currentCalDate); // Refresh indicators
    renderEventsList();
    addToTimeline(`Planned: ${title}`);
    showToast("Event added");
});

function loadEventsForMonth(date) {
    // In a real app, query by date range. Here we fetch all and filter for simplicity
    onSnapshot(collections.events, snap => {
        const days = document.querySelectorAll('.calendar-day');
        snap.forEach(doc => {
            const data = doc.data();
            const evtDate = new Date(data.date);
            if(evtDate.getMonth() === date.getMonth() && evtDate.getFullYear() === date.getFullYear()) {
                // Find the specific day element (offset by empty slots)
                const firstDayOffset = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
                const dayIndex = firstDayOffset + evtDate.getDate() + 1; // Using getDate directly is safer usually
                // Simple match: iterate text content
                days.forEach(day => {
                    if(parseInt(day.textContent) === evtDate.getDate()) day.classList.add('has-event');
                });
            }
        });
        renderEventsList();
    });
}

function renderEventsList() {
    const list = document.getElementById('eventsList');
    list.innerHTML = '';
    // Simple query for upcoming
    onSnapshot(query(collections.events, orderBy('date', 'asc'), limit(5)), snap => {
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'event-item card';
            div.innerHTML = `
                <div><strong>${data.date}</strong><br>${escapeHtml(data.title)}</div>
                <div style="color:var(--subtext);">${data.user}</div>
            `;
            list.appendChild(div);
        });
    });
}

/* ================= MAP LOGIC (FIXED) ================= */
function initMap() {
    const container = document.getElementById('mapContainer');
    if (!container) return;
    
    if (!mapInstance) {
        mapInstance = L.map('mapContainer').setView([34.0522, -118.2437], 10); // Default LA
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, &copy; CartoDB'
        }).addTo(mapInstance);
        renderMapPoints();
    }
    
    setTimeout(() => { mapInstance.invalidateSize(); }, 200);
}

function renderMapPoints() {
    onSnapshot(collections.memories, snap => {
        memoryMarkers.forEach(m => mapInstance.removeLayer(m));
        memoryMarkers = [];
        const list = document.getElementById('memoriesList');
        list.innerHTML = '';
        
        snap.forEach(doc => {
            const data = doc.data();
            const marker = L.marker([data.lat, data.lng]).addTo(mapInstance)
                .bindPopup(`<b>${escapeHtml(data.title)}</b><p>${escapeHtml(data.desc)}</p>`);
            memoryMarkers.push(marker);
            
            const div = document.createElement('div');
            div.className = 'list-item card';
            div.innerHTML = `
                <div class="list-info">
                    <span class="list-title">${escapeHtml(data.title)}</span>
                    <span class="list-sub">${data.user}</span>
                </div>
                <button class="btn icon-btn">✈️</button>
            `;
            div.querySelector('button').onclick = () => {
                mapInstance.flyTo([data.lat, data.lng], 15);
                marker.openPopup();
            };
            list.appendChild(div);
        });
    });
}

document.getElementById('addMemoryBtn').addEventListener('click', () => document.getElementById('memoryModal').classList.add('active'));
document.getElementById('cancelMemoryBtn').addEventListener('click', () => document.getElementById('memoryModal').classList.remove('active'));

document.getElementById('getCurrentLocation').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(pos => {
        document.getElementById('latInput').value = pos.coords.latitude;
        document.getElementById('lngInput').value = pos.coords.longitude;
    });
});

document.getElementById('saveMemoryBtn').addEventListener('click', async () => {
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

/* ================= TIMELINE LOGIC (FIXED) ================= */
function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    onSnapshot(query(collections.timeline, orderBy('timestamp', 'desc'), limit(50)), snap => {
        container.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now';
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
    await addDoc(collections.timeline, {
        action, user: USER_MAP[currentUser.email], timestamp: serverTimestamp()
    });
}

/* ================= FAVORITES LOGIC (FIXED) ================= */
async function toggleFavorite(e, docId, type, url, caption) {
    e.stopPropagation();
    const btn = e.target;
    btn.classList.toggle('active');
    
    // Snapshot the data so we don't have to query the original collection later
    await addDoc(collections.favorites, {
        originalId: docId,
        type: type,
        url: url,
        caption: caption || 'Memory',
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });
    
    showToast("Saved to Sanctum ❤️");
}

function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    onSnapshot(query(collections.favorites, orderBy('timestamp', 'desc')), snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'masonry-item';
            
            let mediaContent = '';
            if (data.type === 'photos' || data.type === 'image') {
                mediaContent = `<img src="${data.url}" loading="lazy">`;
            } else if (data.type === 'videos') {
                mediaContent = `<video src="${data.url}" controls></video>`;
            }
            
            div.innerHTML = `
                ${mediaContent}
                <div class="item-meta">
                    <span>${data.caption}</span>
                    <span>❤️</span>
                </div>
            `;
            grid.appendChild(div);
        });
    });
}

/* ================= MEDIA UPLOAD (Cloudinary) ================= */
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "unsigned_upload";

document.getElementById('photoInput').addEventListener('change', e => handleUpload(e.target.files, 'photos'));
document.getElementById('videoInput').addEventListener('change', e => handleUpload(e.target.files, 'videos'));

async function handleUpload(files, type) {
    if(!files.length) return;
    showToast("Uploading...");
    const bar = document.getElementById(type === 'photos' ? 'photoProgress' : 'videoProgress');
    
    for (let file of files) {
        const fd = new FormData();
        fd.append("upload_preset", UPLOAD_PRESET);
        fd.append("file", file);
        
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            bar.style.width = '100%';
            
            await addDoc(collections[type], {
                url: data.secure_url, type,
                user: USER_MAP[currentUser.email], timestamp: serverTimestamp()
            });
            addToTimeline(`Added a ${type.slice(0,-1)}`);
        } catch(e) { console.error(e); }
    }
    showToast("Done!", "success");
    setTimeout(() => bar.style.width = '0%', 1000);
}

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
            
            div.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e, doc.id, type, data.url, data.user);
            div.querySelector('img')?.addEventListener('click', () => {
                document.querySelector('.lightbox-media-container').innerHTML = `<img src="${data.url}">`;
                document.getElementById('lightbox').classList.add('active');
            });
            
            container.appendChild(div);
        });
    });
}

/* ================= INITIALIZATION ================= */
function initApp() {
    updateDaysCounter();
    renderGallery('photos');
    renderGallery('videos');
    // Initialize theme
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('darkModeToggle').checked = true;
    }
}

document.getElementById('darkModeToggle').addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
});

// Modal Close Logic
document.querySelectorAll('.close-lightbox').forEach(b => b.onclick = () => document.getElementById('lightbox').classList.remove('active'));
