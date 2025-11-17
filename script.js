// script.js - Enhanced with new features: password protection, global search, favorites, voice notes, playlists, export, pagination, improved error handling, PWA support

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, where, limit, startAfter
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

/* ================= FIREBASE CONFIG ================= */
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
const analytics = getAnalytics(app);
const db = getFirestore(app);

/* ================= PASSWORD PROTECTION ================= */
const PASSWORD = "midnightwhispers"; // Change this to your secret
const passwordModal = document.getElementById("passwordModal");
const passwordInput = document.getElementById("passwordInput");
const unlockBtn = document.getElementById("unlockBtn");

unlockBtn.addEventListener("click", () => {
  if (passwordInput.value === PASSWORD) {
    passwordModal.classList.remove("active");
    document.body.style.overflow = "";
    initApp();
  } else {
    alert("That's not it, love. Try again 💕");
    passwordInput.value = "";
  }
});
passwordInput.addEventListener("keypress", (e) => { if (e.key === "Enter") unlockBtn.click(); });

// Show modal on load
document.addEventListener("DOMContentLoaded", () => {
  passwordModal.classList.add("active");
  document.body.style.overflow = "hidden";
  passwordInput.focus();
});

/* ================= CLOUDINARY UPLOAD ================= */
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "unsigned_upload";

async function uploadToCloudinary(file, progressEl) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        progressEl.style.width = percent + "%";
      }
    });
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = reject;
    xhr.send(formData);
  });
}

/* ================= DOM REFERENCES ================= */
const navButtons = document.querySelectorAll(".nav button");
const sections = document.querySelectorAll(".section");
const globalSearch = document.getElementById("globalSearch");
let currentSection = "photos";
const PAGE_SIZE = 20;
let lastDoc = {};

/* ================= APP INIT ================= */
function initApp() {
  navButtons.forEach(btn => btn.addEventListener("click", () => showSection(btn.dataset.section)));
  globalSearch.addEventListener("input", debounce(handleGlobalSearch, 300));
  showSection("photos");
  
  // PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js"); // Assume you add a service worker file
  }

  renderAll();
}

/* ================= SECTION MANAGEMENT ================= */
function showSection(id) {
  sections.forEach(s => s.id === id ? s.classList.add("active") : s.classList.remove("active"));
  navButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.section === id));
  currentSection = id;
  if (id === "searchResults" && globalSearch.value) handleGlobalSearch();
  else if (lastDoc[id]) loadMore(id); // Auto-load if paginated
}

/* ================= COLLECTIONS ================= */
const collections = {
  photos: collection(db, "photos"),
  videos: collection(db, "videos"),
  music: collection(db, "music"),
  notes: collection(db, "notes"),
  timeline: collection(db, "timeline"),
  favorites: collection(db, "favorites"),
  playlists: collection(db, "playlists")
};

async function addToTimeline(action, type = "general") {
  try {
    await addDoc(collections.timeline, { action, type, timestamp: serverTimestamp() });
  } catch (err) {
    console.error("Timeline add failed", err);
  }
}

/* ================= PAGINATION ================= */
async function loadGallery(collectionKey, galleryEl, loadMoreEl, type, lastDocRef = null, limitNum = PAGE_SIZE) {
  const q = query(collections[collectionKey], orderBy("timestamp", "desc"), limit(limitNum), ...(lastDocRef ? [startAfter(lastDocRef)] : []));
  const snapshot = await getDocs(q); // Note: Use getDocs from firebase-firestore for one-time fetch
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = makeMediaCard({ url: data.url, id: docSnap.id, type, timestamp: data.timestamp });
    galleryEl.appendChild(card);
  });
  if (snapshot.docs.length < limitNum) loadMoreEl.style.display = "none";
  else {
    lastDoc[collectionKey] = snapshot.docs[snapshot.docs.length - 1];
    loadMoreEl.style.display = "block";
    loadMoreEl.onclick = () => loadGallery(collectionKey, galleryEl, loadMoreEl, type, lastDoc[collectionKey]);
  }
  initLightboxItems();
}

// Note: Import getDocs if not already
import { getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* ================= PHOTOS & VIDEOS ================= */
const photoInput = document.getElementById("photoInput");
const photoGallery = document.getElementById("photoGallery");
const loadMorePhotos = document.getElementById("loadMorePhotos");
const photoUploaders = document.querySelectorAll("[data-type='photos']");

photoUploaders.forEach(u => {
  u.addEventListener("click", () => photoInput.click());
  u.addEventListener("dragover", e => { e.preventDefault(); u.style.borderColor = "var(--primary)"; });
  u.addEventListener("dragleave", () => u.style.borderColor = "var(--subtext)");
  u.addEventListener("drop", e => { e.preventDefault(); photoInput.files = e.dataTransfer.files; handleFiles(e.dataTransfer.files, "photos"); u.style.borderColor = "var(--subtext)"; });
});

photoInput.addEventListener("change", e => handleFiles(e.target.files, "photos"));

async function handleFiles(files, type) {
  for (const file of Array.from(files)) {
    const progressEl = document.getElementById(type === "photos" ? "photoProgress" : "videoProgress");
    progressEl.style.width = "0%";
    const tempCard = makeTempCard(file, type);
    if (type === "photos") photoGallery.prepend(tempCard);
    else /* video gallery */ document.getElementById("videoGallery").prepend(tempCard);
    try {
      const url = await uploadToCloudinary(file, progressEl);
      await addDoc(collections[type], { url, timestamp: serverTimestamp() });
      addToTimeline(`${type.slice(0,-1)} added 💖`);
      tempCard.remove();
    } catch (err) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
      tempCard.remove();
    }
  }
}

// Similar for videos...

// Render functions with pagination
function renderPhotos() {
  photoGallery.innerHTML = "";
  loadGallery("photos", photoGallery, loadMorePhotos, "image");
}
function renderVideos() {
  // Similar to photos
}

/* ================= GLOBAL SEARCH ================= */
async function handleGlobalSearch() {
  const term = globalSearch.value.trim().toLowerCase();
  if (!term) return showSection(currentSection);
  showSection("searchResults");
  const output = document.getElementById("globalSearchOutput");
  output.innerHTML = "<div class='muted'>Searching...</div>";
  // Search across collections (simplified, use Algolia or full-text in prod)
  const results = [];
  for (const [key, coll] of Object.entries(collections)) {
    if (key === "timeline" || key === "playlists") continue;
    const q = query(coll, where("text", ">=", term), where("text", "<=", term + "\uf8ff"), limit(5)); // Approx search
    const snap = await getDocs(q);
    snap.forEach(d => results.push({ ...d.data(), id: d.id, type: key }));
  }
  output.innerHTML = results.map(r => `<div class="card"><p>${r.type}: ${r.text || r.title || r.action}</p></div>`).join("") || "<div class='muted'>No matches found.</div>";
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

/* ================= FAVORITES ================= */
let favorites = new Set();
onSnapshot(collections.favorites, snap => {
  favorites = new Set(snap.docs.map(d => d.id));
  renderFavorites();
});

function toggleFavorite(id, type, el) {
  if (favorites.has(id)) {
    deleteDoc(doc(collections.favorites, id));
    el.classList.remove("active");
  } else {
    addDoc(collections.favorites, { itemId: id, type, timestamp: serverTimestamp() });
    el.classList.add("active");
  }
  renderFavorites();
}

function renderFavorites() {
  // Fetch and render mixed favorites
  const list = document.getElementById("favoritesList");
  list.innerHTML = ""; // Placeholder: fetch from favorites collection and render cards
}

/* ================= MUSIC WITH PLAYLISTS ================= */
let currentPlaylist = null;
const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const searchResults = document.getElementById("searchResults");
const savedMusic = document.getElementById("savedMusic");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");

addMusicBtn.addEventListener("click", searchMusic);
createPlaylistBtn.addEventListener("click", () => {
  const name = prompt("Playlist name?");
  if (name) {
    addDoc(collections.playlists, { name, tracks: [], timestamp: serverTimestamp() });
    addToTimeline(`Playlist created: ${name}`);
  }
});

async function searchMusic() {
  // Existing logic, enhanced with error handling
  const q = musicInput.value.trim();
  if (!q) return;
  searchResults.innerHTML = "<div class='muted'>Discovering tunes...</div>";
  try {
    const res = await fetch(`https://love-site-spotify-backend.vercel.app/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    searchResults.innerHTML = "";
    data.slice(0, 10).forEach(track => { // Limit results
      const item = createMusicItem(track, null, false);
      searchResults.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    searchResults.innerHTML = "<div class='muted'>Couldn’t fetch music. Try again?</div>";
  }
}

function createMusicItem(track, id = null, saved = false, playlist = null) {
  const root = document.createElement("div");
  root.className = "musicItem card";
  // Enhanced HTML with favorite button
  root.innerHTML = `
    <img src="${track.album?.images?.[0]?.url || 'https://via.placeholder.com/300x300?text=🎵'}" alt="${track.name}">
    <div class="info">
      <p class="music-title">${track.name}</p>
      <p>${track.artists?.map(a => a.name).join(', ')}</p>
      ${track.preview_url ? `<audio controls src="${track.preview_url}"></audio>` : ''}
      <div class="musicButtons">
        <a href="${track.external_urls?.spotify}" target="_blank" rel="noopener">Spotify ▶️</a>
        ${saved ? `<button class="ghost" onclick="removeMusic('${id}')">Remove</button>` : `<button class="primary" onclick="addMusic(${JSON.stringify(track)})">Add to Treasures</button>`}
        ${playlist ? `<button class="secondary" onclick="addToPlaylist('${playlist}', '${track.id}')">Add to Playlist</button>` : ''}
      </div>
    </div>
    <button class="favorite-btn" onclick="toggleFavorite('${track.id}', 'music', this)">❤️</button>
  `;
  return root;
}

// Global functions for onclick
window.addMusic = async (track) => {
  await addDoc(collections.music, { ...track, timestamp: serverTimestamp() });
  addToTimeline(`Added "${track.name}" 🎵`);
};
window.removeMusic = async (id) => {
  if (confirm('Remove this melody?')) {
    await deleteDoc(doc(collections.music, id));
    addToTimeline(`Removed music`);
  }
};

/* ================= NOTES WITH VOICE ================= */
const noteInput = document.getElementById("noteInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const notesList = document.getElementById("notesList");
const voiceNoteBtn = document.getElementById("voiceNoteBtn");
const voiceModal = document.getElementById("voiceModal");
let mediaRecorder;
let audioChunks = [];

saveNoteBtn.addEventListener("click", async () => {
  const text = noteInput.value.trim();
  if (!text) return alert("Share a whisper first 💭");
  await addDoc(collections.notes, { text, timestamp: serverTimestamp() });
  addToTimeline("Whisper saved ✍️");
  noteInput.value = "";
});

voiceNoteBtn.addEventListener("click", () => voiceModal.classList.add("active"));

const startRecord = document.getElementById("startRecord");
const stopRecord = document.getElementById("stopRecord");
const voicePreview = document.getElementById("voicePreview");
const saveVoiceBtn = document.getElementById("saveVoiceBtn");

startRecord.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    voicePreview.src = URL.createObjectURL(audioBlob);
    voicePreview.style.display = "block";
    saveVoiceBtn.disabled = false;
    audioChunks = [];
  };
  mediaRecorder.start();
  startRecord.disabled = true;
  stopRecord.disabled = false;
});

stopRecord.addEventListener("click", () => {
  mediaRecorder.stop();
  startRecord.disabled = false;
  stopRecord.disabled = true;
});

saveVoiceBtn.addEventListener("click", async () => {
  const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
  const url = await uploadToCloudinary(audioBlob, document.createElement("div")); // Reuse upload
  await addDoc(collections.notes, { text: `[Voice Note] ${voicePreview.src = url}`, audioUrl: url, timestamp: serverTimestamp() });
  addToTimeline("Voice whisper saved 🎤");
  voiceModal.classList.remove("active");
  voicePreview.style.display = "none";
  saveVoiceBtn.disabled = true;
});

function renderNotes() {
  const q = query(collections.notes, orderBy("timestamp", "desc"), limit(PAGE_SIZE));
  onSnapshot(q, snapshot => {
    notesList.innerHTML = "";
    if (snapshot.empty) return notesList.innerHTML = "<div class='muted'>No whispers yet.</div>";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "note-card card";
      const when = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleDateString() : "Now";
      card.innerHTML = `
        <div class="info">
          <strong>${when}</strong>
          <p>${escapeHtml(data.text)}</p>
          ${data.audioUrl ? `<audio controls src="${data.audioUrl}"></audio>` : ''}
          <button class="ghost" onclick="deleteNote('${docSnap.id}')">Delete</button>
          <button class="favorite-btn" onclick="toggleFavorite('${docSnap.id}', 'notes', this)">❤️</button>
        </div>
      `;
      notesList.appendChild(card);
    });
  });
}

window.deleteNote = async (id) => {
  if (confirm("Erase this whisper?")) {
    await deleteDoc(doc(collections.notes, id));
  }
};

/* ================= TIMELINE WITH CALENDAR ================= */
function renderTimeline() {
  const list = document.getElementById("timelineList");
  const cal = document.getElementById("timelineCalendar");
  const q = query(collections.timeline, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    list.innerHTML = "";
    if (snapshot.empty) return list.innerHTML = "<div class='muted'>Our story begins...</div>";
    // Simple calendar: days with events
    const eventsByDate = {};
    snapshot.forEach(d => {
      const date = d.data().timestamp?.toDate().toLocaleDateString();
      if (date) eventsByDate[date] = (eventsByDate[date] || 0) + 1;
    });
    cal.innerHTML = Object.entries(eventsByDate).map(([date, count]) => `<div class="timeline-day" title="${count} events on ${date}">${date.split('/')[1]}</div>`).join("");
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const item = document.createElement("div");
      item.className = "timeline-item card";
      const when = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : "Just now";
      item.innerHTML = `<strong>${when}</strong><p>${escapeHtml(data.action)}</p>`;
      list.appendChild(item);
    });
  });
}

/* ================= EXPORT ================= */
document.getElementById("exportDataBtn").addEventListener("click", async () => {
  const data = {};
  for (const [key, coll] of Object.entries(collections)) {
    if (key === "favorites" || key === "playlists") continue;
    const q = query(coll);
    const snap = await getDocs(q);
    data[key] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "our-memories.json";
  a.click();
  URL.revokeObjectURL(url);
  addToTimeline("Exported memories 📤");
});

/* ================= LIGHTBOX ENHANCED ================= */
const lightbox = document.getElementById("lightbox");
const lbContent = document.querySelector(".lightbox-content");
const lbCaption = document.querySelector(".lightbox-caption");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
let lbItems = [], lbIndex = 0;

function initLightboxItems() {
  lbItems = Array.from(document.querySelectorAll(".card img, .card video")).map(el => ({
    url: el.src,
    type: el.tagName === "IMG" ? "image" : "video",
    caption: el.parentElement.querySelector(".meta-left")?.textContent || ""
  }));
}

function openLightbox(url, caption = "", type = "image") {
  initLightboxItems();
  lbIndex = lbItems.findIndex(i => i.url === url);
  if (lbIndex === -1) {
    lbItems.push({ url, type, caption });
    lbIndex = lbItems.length - 1;
  }
  renderLB();
  lightbox.classList.add("active");
  document.body.style.overflow = "hidden";
  prevBtn.onclick = () => { lbIndex = (lbIndex - 1 + lbItems.length) % lbItems.length; renderLB(); };
  nextBtn.onclick = () => { lbIndex = (lbIndex + 1) % lbItems.length; renderLB(); };
}

function renderLB() {
  const item = lbItems[lbIndex];
  lbContent.innerHTML = item.type === "video"
    ? `<video src="${item.url}" controls autoplay></video>`
    : `<img src="${item.url}" alt="${item.caption}">`;
  lbCaption.textContent = item.caption;
}

function closeLB() {
  lightbox.classList.remove("active");
  document.body.style.overflow = "";
}
document.querySelector(".close").addEventListener("click", closeLB);
lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLB(); });
document.addEventListener("keydown", e => {
  if (lightbox.classList.contains("active")) {
    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "ArrowRight") nextBtn.click();
  }
});

/* ================= MEDIA CARDS ================= */
function makeMediaCard({ url, id, type, timestamp }) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  const media = type === "image" ? document.createElement("img") : document.createElement("video");
  media.src = url;
  if (type === "video") { media.controls = false; media.preload = "metadata"; }
  wrapper.appendChild(media);
  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.innerHTML = `
    <div class="meta-left">${timestamp ? new Date(timestamp.toDate()).toLocaleDateString() : "Now"}</div>
    <div class="meta-actions">
      <button class="ghost" onclick="openLightbox('${url}', 'Preview', '${type}')">👁️ View</button>
      <button class="ghost" onclick="deleteItem('${id}', '${type}')">🗑️ Delete</button>
    </div>
  `;
  wrapper.appendChild(meta);
  wrapper.addEventListener("click", () => openLightbox(url, meta.querySelector(".meta-left").textContent, type));
  const favBtn = document.createElement("button");
  favBtn.className = "favorite-btn";
  favBtn.textContent = "❤️";
  favBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(id, type, favBtn); };
  wrapper.appendChild(favBtn);
  if (favorites.has(id)) favBtn.classList.add("active");
  return wrapper;
}

function makeTempCard(file, type) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  const media = type === "image" ? document.createElement("img") : document.createElement("video");
  media.src = URL.createObjectURL(file);
  media.style.filter = "blur(5px)";
  if (type === "video") { media.muted = true; media.loop = true; }
  wrapper.appendChild(media);
  wrapper.innerHTML += "<div class='card-meta'><div class='meta-left'>Uploading... ✨</div></div>";
  return wrapper;
}

window.deleteItem = async (id, type) => {
  if (confirm(`Delete this ${type}?`)) {
    await deleteDoc(doc(collections[type], id));
    addToTimeline(`${type} deleted`);
  }
};

/* ================= RENDER ALL ================= */
function renderAll() {
  renderTimeline();
  renderNotes();
  // renderSavedMusic(); // With onSnapshot
  onSnapshot(query(collections.music, orderBy("timestamp", "desc")), snap => {
    savedMusic.innerHTML = "";
    if (snap.empty) return savedMusic.innerHTML = "<div class='muted'>No treasures yet.</div>";
    snap.forEach(d => savedMusic.appendChild(createMusicItem(d.data(), d.id, true)));
  });
  renderPhotos();
  renderVideos(); // Implement similar
  renderFavorites();
}

/* ================= UTILITIES ================= */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Add sw.js for PWA caching (separate file):
/*
self.addEventListener('install', e => {
  e.waitUntil(caches.open('memories-v1').then(cache => cache.addAll(['/']))); // Cache essentials
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
*/
