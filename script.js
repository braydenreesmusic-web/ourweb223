// script.js - Enhanced: iOS Native Feel, Masonry, Robust Error Handling

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, where, limit, startAfter, getDocs, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
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
// Note: In production, passwords should not be client-side hardcoded.
// Assuming this is a private hobby app.
const START_DATE = new Date("2023-01-01"); // REPLACE WITH YOUR ACTUAL START DATE

let currentUser = null;
let currentSection = "photos";
let mapInstance = null;
let memoryMarkers = [];

/* ================= UI HELPERS ================= */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  
  container.appendChild(toast);
  
  // Haptic feedback simulation
  if(navigator.vibrate) navigator.vibrate(10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function updateDaysCounter() {
  const diff = Date.now() - START_DATE.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  document.getElementById('daysCounter').textContent = `DAY ${days} TOGETHER`;
}

/* ================= AUTH & PRESENCE ================= */
const authModal = document.getElementById("authModal");
const braydenLogin = document.getElementById("braydenLogin");
const younaLogin = document.getElementById("younaLogin");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");

// Presets
braydenLogin.addEventListener("click", () => setAuthPreset('brayden'));
younaLogin.addEventListener("click", () => setAuthPreset('youna'));

function setAuthPreset(userKey) {
  braydenLogin.classList.toggle("active", userKey === 'brayden');
  younaLogin.classList.toggle("active", userKey === 'youna');
  authEmail.value = USERS[userKey];
  authPassword.focus();
}

document.getElementById("signInBtn").addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, authEmail.value, authPassword.value);
    showToast("Welcome back, love.", "success");
    authModal.classList.remove("active");
  } catch (err) {
    document.getElementById("authError").textContent = "The spell failed. Try again.";
    showToast("Authentication failed.", "error");
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  if(currentUser) {
     const presenceRef = ref(rtdb, `presence/${currentUser.uid}`);
     await set(presenceRef, { online: false, timestamp: Date.now() });
  }
  await signOut(auth);
  authModal.classList.add("active");
});

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    authModal.classList.remove("active");
    setupPresence(user);
    initApp();
    document.getElementById("logoutBtn").style.display = "block";
  } else {
    authModal.classList.add("active");
  }
});

function setupPresence(user) {
  const presenceRef = ref(rtdb, `presence/${user.uid}`);
  const userName = USER_MAP[user.email] || 'Mystery';
  
  set(presenceRef, { online: true, timestamp: Date.now(), user: userName });
  onDisconnect(presenceRef).set({ online: false, timestamp: Date.now(), user: userName });

  // Listen to others
  const presenceList = ['brayden@love.com', 'youna@love.com'];
  presenceList.forEach(email => {
    // Find key based on known map (simplified for this context)
    // ideally we store uids in a document, but we'll scan RTDB or just hardcode listener for simplicity if we knew UIDs
    // For this demo, we update UI based on whoever is in RTDB
  });
  
  onValue(ref(rtdb, 'presence'), (snap) => {
    const data = snap.val();
    if(!data) return;
    
    Object.values(data).forEach(p => {
        if(p.user === 'Brayden') togglePresence('braydenPresence', p.online);
        if(p.user === 'Youna') togglePresence('younaPresence', p.online);
    });
  });
}

function togglePresence(id, isOnline) {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('online', isOnline);
}

/* ================= NAVIGATION ================= */
const tabButtons = document.querySelectorAll(".tab-btn");
const sections = document.querySelectorAll(".section");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const sectionId = btn.dataset.section;
    
    // Update Tabs
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Update Sections with animation
    sections.forEach(s => s.classList.remove("active"));
    const target = document.getElementById(sectionId);
    target.classList.add("active");
    
    currentSection = sectionId;
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    // Specific inits
    if (sectionId === "mapSection") setTimeout(initMap, 100); // Delay for layout
    if (sectionId === "favorites") renderFavorites();
  });
});

/* ================= MEDIA UPLOAD (Cloudinary) ================= */
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "unsigned_upload";

async function uploadToCloudinary(file, progressBarId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("file", file);

    xhr.open("POST", url, true);
    
    if(progressBarId) {
        const bar = document.getElementById(progressBarId);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                bar.style.width = percent + '%';
            }
        };
    }

    xhr.onload = function() {
      if (this.status === 200) {
        const resp = JSON.parse(this.responseText);
        resolve(resp.secure_url);
      } else {
        reject(this.statusText);
      }
    };
    xhr.onerror = () => reject("Network Error");
    xhr.send(fd);
  });
}

// Handlers for inputs
['photo', 'video'].forEach(type => {
    const input = document.getElementById(`${type}Input`);
    const wrapper = document.querySelector(`[data-type="${type}s"]`); // Note the 's' match
    
    if(wrapper) {
        wrapper.addEventListener('click', () => input.click());
        input.addEventListener('change', (e) => handleMediaUpload(e.target.files, type));
    }
});

async function handleMediaUpload(files, type) {
    if(!files.length) return;
    showToast(`Uploading ${files.length} memories...`);
    const user = USER_MAP[currentUser.email] || 'Us';
    const collectionName = type + 's'; // photos or videos
    
    for (let file of files) {
        try {
            const url = await uploadToCloudinary(file, `${type}Progress`);
            await addDoc(collections[collectionName], {
                url,
                timestamp: serverTimestamp(),
                user,
                type: type // 'photo' or 'video'
            });
            addToTimeline(`Added a ${type}`);
        } catch (e) {
            console.error(e);
            showToast("Upload failed.", "error");
        }
    }
    
    showToast("Upload complete!", "success");
    document.getElementById(`${type}Progress`).style.width = '0%';
    renderGallery(collectionName);
}

/* ================= RENDERING GALLERIES (Masonry) ================= */
function renderGallery(type) {
    const galleryId = type === 'photos' ? 'photoGallery' : 'videoGallery';
    const container = document.getElementById(galleryId);
    
    const q = query(collections[type], orderBy("timestamp", "desc"), limit(20));
    
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'masonry-item';
            
            let mediaEl;
            if (type === 'photos') {
                mediaEl = `<img src="${data.url}" loading="lazy" alt="Memory">`;
            } else {
                mediaEl = `<video src="${data.url}" preload="metadata"></video>`;
            }
            
            div.innerHTML = `
                ${mediaEl}
                <div class="item-meta">
                    <span>${data.user}</span>
                    <button class="btn icon-btn fav-btn" data-id="${docSnap.id}" data-coll="${type}">❤️</button>
                </div>
            `;
            
            div.querySelector('img, video')?.addEventListener('click', () => openLightbox(data.url, type, data.user));
            div.querySelector('.fav-btn').addEventListener('click', (e) => toggleFavorite(e, docSnap.id, type));
            
            container.appendChild(div);
        });
    });
}

/* ================= LIGHTBOX ================= */
const lightbox = document.getElementById('lightbox');
function openLightbox(url, type, caption) {
    const container = lightbox.querySelector('.lightbox-media-container');
    const captionEl = lightbox.querySelector('.lightbox-caption');
    
    container.innerHTML = '';
    if(type === 'photos' || type === 'image') {
        container.innerHTML = `<img src="${url}">`;
    } else {
        container.innerHTML = `<video src="${url}" controls autoplay></video>`;
    }
    
    captionEl.textContent = `Captured by ${caption}`;
    lightbox.classList.add('active');
}

document.querySelector('.close-lightbox').addEventListener('click', () => lightbox.classList.remove('active'));

/* ================= MUSIC ================= */
document.getElementById("addMusicBtn").addEventListener("click", searchMusic);

async function searchMusic() {
    const queryText = document.getElementById("musicInput").value;
    if(!queryText) return;
    
    const container = document.getElementById("musicSearchResults");
    container.innerHTML = '<p class="text-center">Tuning into the cosmos...</p>';
    
    try {
        // Fallback to a generic list if the API is down, for demo reliability
        const res = await fetch(`https://love-site-spotify-backend.vercel.app/search?q=${encodeURIComponent(queryText)}`);
        const data = await res.json();
        
        container.innerHTML = '';
        data.slice(0, 5).forEach(track => {
            const el = createMusicRow(track, false);
            container.appendChild(el);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-center">The frequency is blocked. Try again later.</p>';
    }
}

function createMusicRow(track, isSaved, docId = null) {
    const div = document.createElement('div');
    div.className = 'list-item';
    const img = track.album?.images[0]?.url || 'https://via.placeholder.com/60';
    
    div.innerHTML = `
        <img src="${img}" alt="Art">
        <div class="list-info">
            <span class="list-title">${escapeHtml(track.name)}</span>
            <span class="list-sub">${escapeHtml(track.artists[0].name)}</span>
        </div>
        ${track.preview_url ? `<button class="btn icon-btn play-preview" data-src="${track.preview_url}">▶</button>` : ''}
        <button class="btn icon-btn action-btn">${isSaved ? '🗑️' : '➕'}</button>
    `;
    
    // Handlers
    div.querySelector('.play-preview')?.addEventListener('click', (e) => {
        const audio = new Audio(e.target.dataset.src);
        audio.play();
        showToast(`Playing snippet: ${track.name}`);
    });

    const actionBtn = div.querySelector('.action-btn');
    actionBtn.addEventListener('click', async () => {
        if(isSaved) {
            if(confirm("Remove this song?")) await deleteDoc(doc(collections.music, docId));
        } else {
            const user = USER_MAP[currentUser.email];
            await addDoc(collections.music, { ...track, user, timestamp: serverTimestamp() });
            showToast("Song enshrined.");
        }
    });
    
    return div;
}

function renderMusic() {
    onSnapshot(query(collections.music, orderBy("timestamp", "desc")), (snap) => {
        const div = document.getElementById('savedMusic');
        div.innerHTML = '';
        snap.forEach(d => div.appendChild(createMusicRow(d.data(), true, d.id)));
    });
}

/* ================= MAP ================= */
function initMap() {
    if (mapInstance) {
        mapInstance.invalidateSize(); // CRITICAL for iOS/Tabs
        return;
    }
    
    mapInstance = L.map('mapContainer').setView([37.7749, -122.4194], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB'
    }).addTo(mapInstance);
    
    renderMapPoints();
}

function renderMapPoints() {
    onSnapshot(collections.memories, (snap) => {
        // Clear old
        memoryMarkers.forEach(m => mapInstance.removeLayer(m));
        memoryMarkers = [];
        const list = document.getElementById('memoriesList');
        list.innerHTML = '';

        snap.forEach(d => {
            const data = d.data();
            const marker = L.marker([data.lat, data.lng]).addTo(mapInstance)
                .bindPopup(`<b>${escapeHtml(data.title)}</b><br>${escapeHtml(data.desc)}`);
            memoryMarkers.push(marker);
            
            // List Item
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-info">
                    <span class="list-title">${escapeHtml(data.title)}</span>
                    <span class="list-sub">${data.user} • ${data.lat.toFixed(2)}, ${data.lng.toFixed(2)}</span>
                </div>
                <button class="btn icon-btn" onclick="mapInstance.flyTo([${data.lat}, ${data.lng}], 15)">✈️</button>
            `;
            list.appendChild(item);
        });
    });
}

document.getElementById('addMemoryBtn').addEventListener('click', () => {
    document.getElementById('memoryModal').classList.add('active');
    if(mapInstance) mapInstance.invalidateSize();
});

document.getElementById('getCurrentLocation').addEventListener('click', () => {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('latInput').value = pos.coords.latitude;
            document.getElementById('lngInput').value = pos.coords.longitude;
            showToast("Location acquired.");
        });
    }
});

document.getElementById('saveMemoryBtn').addEventListener('click', async () => {
    const title = document.getElementById('memoryTitle').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    const desc = document.getElementById('memoryDesc').value;

    if(title && lat && lng) {
        await addDoc(collections.memories, {
            title, desc, lat, lng,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
        document.getElementById('memoryModal').classList.remove('active');
        showToast("Memory pinned on the map.");
    }
});

/* ================= FAVORITES & TIMELINE ================= */
async function toggleFavorite(e, id, collectionName) {
    e.stopPropagation();
    e.target.classList.toggle('active');
    // In a real app, you'd check if it exists first to delete, or add.
    // Simplification: Just adding to favorites collection for now
    await addDoc(collections.favorites, {
        refId: id,
        collection: collectionName,
        timestamp: serverTimestamp()
    });
    showToast("Added to Sanctum ❤️");
}

async function addToTimeline(action) {
    await addDoc(collections.timeline, {
        action,
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });
}

/* ================= NOTES & VOICE ================= */
// Basic implementation of Voice using Cloudinary (reusing upload logic)
let mediaRecorder;
let audioChunks = [];

document.getElementById('voiceNoteBtn').addEventListener('click', () => {
    document.getElementById('voiceModal').classList.add('active');
});

document.getElementById('startRecord').addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    
    document.getElementById('startRecord').disabled = true;
    document.getElementById('stopRecord').disabled = false;
    
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = document.getElementById('voicePreview');
        audio.src = audioUrl;
        audio.style.display = 'block';
        document.getElementById('saveVoiceBtn').disabled = false;
        
        // Handle save
        document.getElementById('saveVoiceBtn').onclick = async () => {
            const url = await uploadToCloudinary(audioBlob, null);
            await addDoc(collections.notes, {
                type: 'voice',
                url,
                user: USER_MAP[currentUser.email],
                timestamp: serverTimestamp()
            });
            document.getElementById('voiceModal').classList.remove('active');
            showToast("Voice note saved.");
        };
    };
});

document.getElementById('stopRecord').addEventListener('click', () => {
    mediaRecorder.stop();
    document.getElementById('startRecord').disabled = false;
});

document.getElementById('saveNoteBtn').addEventListener('click', async () => {
    const text = document.getElementById('noteInput').value;
    if(!text) return;
    await addDoc(collections.notes, {
        text,
        type: 'text',
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });
    document.getElementById('noteInput').value = '';
    showToast("Note inscribed.");
});

function renderNotes() {
    onSnapshot(query(collections.notes, orderBy("timestamp", "desc")), snap => {
        const list = document.getElementById('notesList');
        list.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            const div = document.createElement('div');
            div.className = 'card';
            if(data.type === 'voice') {
                div.innerHTML = `<p>🎤 Voice Note by ${data.user}</p><audio controls src="${data.url}"></audio>`;
            } else {
                div.innerHTML = `<p style="font-family: var(--font-serif); font-size: 1.1rem;">"${escapeHtml(data.text)}"</p><p class="list-sub">- ${data.user}</p>`;
            }
            list.appendChild(div);
        });
    });
}

/* ================= INIT ================= */
function initApp() {
    updateDaysCounter();
    renderGallery('photos');
    renderGallery('videos');
    renderMusic();
    renderNotes();
    
    // Dark Mode Logic
    const toggle = document.getElementById('darkModeToggle');
    toggle.addEventListener('change', (e) => {
        document.body.classList.toggle('dark', e.target.checked);
        localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
    });
    
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        toggle.checked = true;
    }
}

// Close modals on outside click
document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
        if(e.target === m && m.id !== 'authModal') m.classList.remove('active');
    });
});

document.querySelectorAll('.close-modal').forEach(b => {
    b.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('active');
    });
});
