// script.js - Fixed music (event delegation), added Schedule with calendar, iOS optimizations, stunning interactions

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, where, limit, startAfter, getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

/* ================= FIREBASE ================= */
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
const analytics = getAnalytics(app);

const PASSWORD = "love"; // Update as needed
const collections = {
  photos: collection(db, "photos"),
  videos: collection(db, "videos"),
  music: collection(db, "music"),
  notes: collection(db, "notes"),
  events: collection(db, "events"),
  timeline: collection(db, "timeline"),
  favorites: collection(db, "favorites"),
  playlists: collection(db, "playlists")
};

/* ================= PASSWORD ================= */
const passwordModal = document.getElementById("passwordModal");
const passwordInput = document.getElementById("passwordInput");
const unlockBtn = document.getElementById("unlockBtn");

unlockBtn.addEventListener("click", () => {
  if (passwordInput.value === PASSWORD) {
    passwordModal.classList.remove("active");
    document.body.style.overflow = "";
    initApp();
  } else {
    passwordInput.value = "";
    passwordInput.placeholder = "Not quite, darling...";
    setTimeout(() => passwordInput.placeholder = "What we share in the dark...", 2000);
  }
});
passwordInput.addEventListener("keypress", e => e.key === "Enter" && unlockBtn.click());

document.addEventListener("DOMContentLoaded", () => {
  passwordModal.classList.add("active");
  document.body.style.overflow = "hidden";
  passwordInput.focus();
});

/* ================= UPLOAD TO CLOUDINARY ================= */
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "unsigned_upload";

async function uploadToCloudinary(file, progressEl) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`);
    if (progressEl) {
      xhr.upload.addEventListener("progress", e => {
        if (e.lengthComputable) progressEl.style.width = (e.loaded / e.total * 100) + "%";
      });
    }
    xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText).secure_url) : reject(new Error("Upload error"));
    xhr.onerror = reject;
    xhr.send(formData);
  });
}

/* ================= INIT & NAV ================= */
const navButtons = document.querySelectorAll(".nav button");
const sections = document.querySelectorAll(".section");
let currentSection = "photos";
const PAGE_SIZE = 24;
let lastDoc = {};

function initApp() {
  navButtons.forEach(btn => btn.addEventListener("click", () => showSection(btn.dataset.section)));
  document.getElementById("globalSearch").addEventListener("input", debounce(handleGlobalSearch, 400));
  showSection("photos");

  // iOS PWA enhancements
  if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
    document.documentElement.classList.add('pwa');
  }

  // Event delegation for dynamic elements
  document.addEventListener("click", handleDynamicClicks);

  renderAll();
  renderCalendar();
}

function showSection(id) {
  sections.forEach(s => s.id === id ? s.classList.add("active") : s.classList.remove("active"));
  navButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.section === id));
  currentSection = id;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleDynamicClicks(e) {
  const target = e.target;
  if (target.matches(".favorite-btn")) toggleFavorite(target.dataset.id, target.dataset.type, target);
  if (target.matches("[data-action='add-music']")) addMusic(JSON.parse(target.dataset.track));
  if (target.matches("[data-action='remove-music']")) removeMusic(target.dataset.id);
  if (target.matches("[data-action='delete-note']")) deleteNote(target.dataset.id);
  if (target.matches("[data-action='delete-item']")) deleteItem(target.dataset.id, target.dataset.type);
  if (target.matches(".calendar-day")) showEventForm(new Date(target.dataset.date));
  if (target.matches("#saveEventBtn")) saveEvent();
  if (target.matches("#cancelEventBtn")) hideEventForm();
  if (target.matches("#createPlaylistBtn")) createPlaylist();
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

/* ================= TIMELINE ================= */
async function addToTimeline(action, type = "milestone") {
  try {
    await addDoc(collections.timeline, { action, type, timestamp: serverTimestamp() });
  } catch (err) { console.error("Timeline error:", err); }
}

function renderTimeline() {
  const list = document.getElementById("timelineList");
  const q = query(collections.timeline, orderBy("timestamp", "desc"), limit(PAGE_SIZE * 2));
  onSnapshot(q, snapshot => {
    list.innerHTML = snapshot.empty ? "<div class='muted'>The story unfolds...</div>" : "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const item = document.createElement("div");
      item.className = "timeline-item card";
      const when = data.timestamp?.toDate?.() ?? new Date();
      item.innerHTML = `<strong style="color: var(--primary);">${when.toLocaleString()}</strong><p>${escapeHtml(data.action)}</p>`;
      list.appendChild(item);
    });
  });
}

/* ================= MEDIA UPLOAD & GALLERY ================= */
const photoInput = document.getElementById("photoInput");
const videoInput = document.getElementById("videoInput");
const photoGallery = document.getElementById("photoGallery");
const videoGallery = document.getElementById("videoGallery");
const loadMorePhotos = document.getElementById("loadMorePhotos");
const loadMoreVideos = document.getElementById("loadMoreVideos");

[photoInput, videoInput].forEach((input, idx) => {
  input.addEventListener("change", e => handleFiles(e.target.files, idx === 0 ? "photos" : "videos"));
});

document.querySelectorAll(".upload-wrapper").forEach(wrapper => {
  const type = wrapper.dataset.type;
  wrapper.addEventListener("click", () => (type === "photos" ? photoInput : videoInput).click());
  wrapper.addEventListener("dragover", e => { e.preventDefault(); wrapper.style.borderColor = "var(--primary)"; });
  wrapper.addEventListener("dragleave", () => wrapper.style.borderColor = "var(--subtext)");
  wrapper.addEventListener("drop", e => {
    e.preventDefault();
    (type === "photos" ? photoInput : videoInput).files = e.dataTransfer.files;
    handleFiles(e.dataTransfer.files, type);
    wrapper.style.borderColor = "var(--subtext)";
  });
});

async function handleFiles(files, type) {
  const gallery = type === "photos" ? photoGallery : videoGallery;
  const progressEl = document.getElementById(`${type}Progress`);
  for (const file of Array.from(files)) {
    progressEl.style.width = "0%";
    const tempCard = makeTempCard(file, type.slice(0, -1));
    gallery.prepend(tempCard);
    try {
      const url = await uploadToCloudinary(file, progressEl);
      await addDoc(collections[type], { url, timestamp: serverTimestamp() });
      addToTimeline(`${type.slice(0, -1).toUpperCase()} captured 💖`);
      tempCard.remove();
      renderGallery(type, gallery, type === "photos" ? loadMorePhotos : loadMoreVideos);
    } catch (err) {
      console.error(err);
      alert("A whisper from the stars: Try again, smaller file perhaps?");
      tempCard.remove();
    }
  }
}

async function renderGallery(type, galleryEl, loadMoreEl) {
  galleryEl.innerHTML = "";
  const q = query(collections[type], orderBy("timestamp", "desc"), limit(PAGE_SIZE));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = makeMediaCard({ ...data, id: docSnap.id, type: type === "photos" ? "image" : "video" });
    galleryEl.appendChild(card);
  });
  lastDoc[type] = snapshot.docs[snapshot.docs.length - 1];
  loadMoreEl.style.display = snapshot.docs.length === PAGE_SIZE ? "block" : "none";
  loadMoreEl.onclick = () => loadMoreMedia(type, galleryEl, loadMoreEl);
}

async function loadMoreMedia(type, galleryEl, loadMoreEl) {
  const q = query(collections[type], orderBy("timestamp", "desc"), startAfter(lastDoc[type]), limit(PAGE_SIZE));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => galleryEl.appendChild(makeMediaCard({ ...docSnap.data(), id: docSnap.id, type: type === "photos" ? "image" : "video" })));
  lastDoc[type] = snapshot.docs[snapshot.docs.length - 1];
  if (snapshot.docs.length < PAGE_SIZE) loadMoreEl.style.display = "none";
  initLightboxItems();
}

function makeMediaCard({ url, id, type, timestamp }) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  const media = type === "image" ? document.createElement("img") : document.createElement("video");
  media.src = url;
  if (type === "video") media.controls = false;
  wrapper.appendChild(media);
  const meta = document.createElement("div");
  meta.className = "card-meta";
  const date = timestamp?.toDate ? new Date(timestamp.toDate()).toLocaleDateString() : new Date().toLocaleDateString();
  meta.innerHTML = `
    <div class="meta-left">${date}</div>
    <div class="meta-actions">
      <button class="ghost" data-action="preview" data-url="${url}" data-type="${type}">👁️</button>
      <button class="ghost" data-action="delete-item" data-id="${id}" data-type="${type}">🗑️</button>
    </div>
  `;
  wrapper.appendChild(meta);
  wrapper.addEventListener("click", () => openLightbox(url, date, type));
  const favBtn = document.createElement("button");
  favBtn.className = "favorite-btn";
  favBtn.dataset.id = id;
  favBtn.dataset.type = type;
  favBtn.innerHTML = "❤️";
  wrapper.appendChild(favBtn);
  return wrapper;
}

function makeTempCard(file, type) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  const media = file.type.startsWith("image/") ? document.createElement("img") : document.createElement("video");
  media.src = URL.createObjectURL(file);
  media.style.filter = "blur(3px) brightness(0.8)";
  wrapper.appendChild(media);
  wrapper.innerHTML += `<div class="card-meta"><div class="meta-left">Weaving magic... ✨</div></div>`;
  return wrapper;
}

/* ================= MUSIC FIXED ================= */
const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicSearchResults = document.getElementById("musicSearchResults");
const savedMusic = document.getElementById("savedMusic");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");

addMusicBtn.addEventListener("click", searchMusic);
musicInput.addEventListener("keypress", e => e.key === "Enter" && searchMusic());

async function searchMusic() {
  const q = musicInput.value.trim();
  if (!q) return;
  musicSearchResults.innerHTML = "<div class='muted'>Tuning the universe...</div>";
  try {
    const res = await fetch(`https://love-site-spotify-backend.vercel.app/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    musicSearchResults.innerHTML = "";
    data.slice(0, 12).forEach(track => musicSearchResults.appendChild(createMusicItem(track, null, false)));
  } catch (err) {
    console.error(err);
    musicSearchResults.innerHTML = "<div class='muted'>The muses are shy today. Try another melody?</div>";
  }
}

function createMusicItem(track, id = null, saved = false) {
  const root = document.createElement("div");
  root.className = "musicItem card";
  root.innerHTML = `
    <img src="${track.album?.images?.[0]?.url || 'https://via.placeholder.com/320x320?text=♪'}" alt="${track.name}" loading="lazy">
    <div class="info">
      <p class="music-title">${escapeHtml(track.name)}</p>
      <p>${escapeHtml(track.artists?.map(a => a.name).join(', '))}</p>
      ${track.preview_url ? `<audio controls src="${track.preview_url}" style="width:100%; margin:10px 0;"></audio>` : ''}
      <div class="musicButtons" style="display:flex; gap:10px; flex-wrap:wrap;">
        <a href="${track.external_urls?.spotify}" target="_blank" rel="noopener" class="ghost">▶️ Spotify</a>
        ${saved ? `<button class="ghost" data-action="remove-music" data-id="${id}">✗</button>` : `<button class="primary" data-action="add-music" data-track='${JSON.stringify(track).replace(/'/g, "\\'")}'>+ Heart</button>`}
      </div>
    </div>
    <button class="favorite-btn" data-id="${track.id}" data-type="music">❤️</button>
  `;
  return root;
}

async function addMusic(track) {
  await addDoc(collections.music, { ...track, timestamp: serverTimestamp() });
  addToTimeline(`Melody embraced: ${track.name} 🎶`);
  musicSearchResults.innerHTML = "<div class='muted'>Enchanted our collection ✨</div>";
}

async function removeMusic(id) {
  if (!confirm("Release this harmony?")) return;
  await deleteDoc(doc(collections.music, id));
  addToTimeline("A note fades gently");
}

function renderSavedMusic() {
  const q = query(collections.music, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    savedMusic.innerHTML = snapshot.empty ? "<div class='muted'>Awaiting our first duet...</div>" : "";
    snapshot.forEach(docSnap => savedMusic.appendChild(createMusicItem(docSnap.data(), docSnap.id, true)));
  });
}

async function createPlaylist() {
  const name = prompt("Name this symphony?");
  if (!name) return;
  const playlistRef = await addDoc(collections.playlists, { name, tracks: [], timestamp: serverTimestamp() });
  addToTimeline(`Symphony born: ${name} 🎼`);
  alert(`Chapter "${name}" awaits your notes!`);
}

/* ================= NOTES WITH VOICE ================= */
const noteInput = document.getElementById("noteInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const notesList = document.getElementById("notesList");

saveNoteBtn.addEventListener("click", async () => {
  const text = noteInput.value.trim();
  if (!text) return noteInput.focus();
  await addDoc(collections.notes, { text, timestamp: serverTimestamp() });
  addToTimeline("A whisper eternalized ✍️");
  noteInput.value = "";
});

function renderNotes() {
  const q = query(collections.notes, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    notesList.innerHTML = snapshot.empty ? "<div class='muted'>Silent pages yearn...</div>" : "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "note-card card";
      const when = data.timestamp?.toDate?.()?.toLocaleDateString() ?? "Eternal";
      card.innerHTML = `
        <div class="info">
          <strong style="color: var(--accent);">${when}</strong>
          <p style="font-family: var(--font-serif); font-style: italic;">${escapeHtml(data.text)}</p>
          <button class="ghost" data-action="delete-note" data-id="${docSnap.id}">🗑️</button>
        </div>
        <button class="favorite-btn" data-id="${docSnap.id}" data-type="notes">❤️</button>
      `;
      notesList.appendChild(card);
    });
  });
}

let mediaRecorder, audioChunks = [];
const voiceModal = document.getElementById("voiceModal");
const startRecord = document.getElementById("startRecord");
const stopRecord = document.getElementById("stopRecord");
const voicePreview = document.getElementById("voicePreview");
const saveVoiceBtn = document.getElementById("saveVoiceBtn");
const voiceNoteBtn = document.getElementById("voiceNoteBtn");

voiceNoteBtn.addEventListener("click", () => voiceModal.classList.add("active"));

startRecord.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/wav' });
      voicePreview.src = URL.createObjectURL(blob);
      voicePreview.style.display = "block";
      saveVoiceBtn.disabled = false;
      stream.getTracks().forEach(track => track.stop());
      audioChunks = [];
    };
    mediaRecorder.start(1000);
    startRecord.disabled = true;
    stopRecord.disabled = false;
  } catch (err) {
    alert("The winds carry no sound today. Check microphone.");
  }
});

stopRecord.addEventListener("click", () => {
  mediaRecorder.stop();
  startRecord.disabled = false;
  stopRecord.disabled = true;
});

saveVoiceBtn.addEventListener("click", async () => {
  const blob = new Blob(audioChunks, { type: 'audio/wav' });
  try {
    const url = await uploadToCloudinary(blob, null);
    await addDoc(collections.notes, { text: "[Voice from the heart]", audioUrl: url, timestamp: serverTimestamp() });
    addToTimeline("Echo preserved 🎤");
    voiceModal.classList.remove("active");
    voicePreview.style.display = "none";
    saveVoiceBtn.disabled = true;
    audioChunks = [];
  } catch (err) { console.error(err); }
});

async function deleteNote(id) {
  if (!confirm("Vanish this echo?")) return;
  await deleteDoc(doc(collections.notes, id));
  addToTimeline("A whisper released");
}

/* ================= SCHEDULE ================= */
let currentDate = new Date();
const calendarGrid = document.getElementById("calendarGrid");
const monthYear = document.getElementById("monthYear");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const eventForm = document.getElementById("eventForm");
const eventsList = document.getElementById("eventsList");

prevMonth.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
nextMonth.addEventListener("click", () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthYear.textContent = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  calendarGrid.innerHTML = "";
  // Days header
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    const div = document.createElement("div");
    div.className = "calendar-day header";
    div.textContent = day;
    div.style.fontWeight = "bold";
    calendarGrid.appendChild(div);
  });
  // Days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    calendarGrid.appendChild(empty);
  }
  const today = new Date().toDateString();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const div = document.createElement("div");
    div.className = `calendar-day ${date.toDateString() === today ? "today" : ""}`;
    div.dataset.date = date.toISOString().split("T")[0];
    div.innerHTML = `<div>${day}</div><div class="events-mini"></div>`;
    calendarGrid.appendChild(div);
  }
  renderEventsOnCalendar();
}

function renderEventsOnCalendar() {
  getDocs(query(collections.events, where("date", ">=", currentDate.getFullYear() + "-" + String(currentDate.getMonth() + 1).padStart(2, "0") + "-01"))).then(snapshot => {
    const eventsByDate = {};
    snapshot.forEach(d => {
      const date = d.data().date;
      eventsByDate[date] = (eventsByDate[date] || 0) + 1;
    });
    document.querySelectorAll(".calendar-day:not(.header):not(.empty)").forEach(day => {
      const dateStr = day.dataset.date;
      if (eventsByDate[dateStr]) day.classList.add("has-event");
      day.querySelector(".events-mini").textContent = eventsByDate[dateStr] || "";
    });
  });
}

function showEventForm(dateStr) {
  document.getElementById("formTitle").textContent = "Manifest Destiny";
  document.getElementById("eventDate").value = dateStr;
  eventForm.style.display = "block";
  eventForm.scrollIntoView({ behavior: "smooth" });
}

function hideEventForm() {
  eventForm.style.display = "none";
  eventForm.querySelectorAll("input, textarea").forEach(el => el.value = "");
}

async function saveEvent() {
  const title = document.getElementById("eventTitle").value.trim();
  const desc = document.getElementById("eventDesc").value.trim();
  const date = document.getElementById("eventDate").value;
  if (!title || !date) return alert("A star needs a name and a sky.");
  await addDoc(collections.events, { title, desc, date, timestamp: serverTimestamp() });
  addToTimeline(`Fate sealed: ${title} on ${date} 🌟`);
  hideEventForm();
  renderEventsList();
  renderCalendar();
}

function renderEventsList() {
  const q = query(collections.events, orderBy("date"));
  onSnapshot(q, snapshot => {
    eventsList.innerHTML = snapshot.empty ? "<div class='muted'>The future is blank canvas...</div>" : "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "event-card card";
      card.innerHTML = `
        <div class="info">
          <strong style="color: var(--accent);">${data.date} - ${escapeHtml(data.title)}</strong>
          <p>${escapeHtml(data.desc)}</p>
          <button class="ghost" data-action="delete-item" data-id="${docSnap.id}" data-type="events">🗑️</button>
        </div>
        <button class="favorite-btn" data-id="${docSnap.id}" data-type="events">❤️</button>
      `;
      eventsList.appendChild(card);
    });
  });
}

/* ================= FAVORITES ================= */
let favorites = new Set();
onSnapshot(collections.favorites, snap => {
  favorites = new Set(snap.docs.map(d => `${d.data().type}_${d.data().itemId}`));
  document.querySelectorAll(".favorite-btn").forEach(btn => {
    const key = `${btn.dataset.type}_${btn.dataset.id}`;
    btn.classList.toggle("active", favorites.has(key));
  });
  renderFavorites();
});

function toggleFavorite(id, type, el) {
  const key = `${type}_${id}`;
  if (favorites.has(key)) {
    // Delete logic: find and delete doc where itemId and type match
    getDocs(query(collections.favorites, where("itemId", "==", id), where("type", "==", type))).then(snap => {
      snap.forEach(d => deleteDoc(doc(collections.favorites, d.id)));
    });
    el.classList.remove("active");
  } else {
    addDoc(collections.favorites, { itemId: id, type, timestamp: serverTimestamp() });
    el.classList.add("active");
  }
  addToTimeline(`${type} hearted ❤️`);
}

function renderFavorites() {
  const list = document.getElementById("favoritesList");
  list.innerHTML = "<div class='muted'>Hearts collect the finest...</div>"; // Simplified; expand to query all types
}

/* ================= GLOBAL SEARCH ================= */
async function handleGlobalSearch() {
  const term = document.getElementById("globalSearch").value.trim().toLowerCase();
  if (!term) return showSection(currentSection);
  showSection("searchResults");
  const output = document.getElementById("globalSearchOutput");
  output.innerHTML = "<div class='muted'>Scrying the ether...</div>";
  // Basic search across notes/music (expand as needed)
  const results = [];
  const noteQ = query(collections.notes, where("text", ">=", term), where("text", "<=", term + "\uf8ff"), limit(5));
  const noteSnap = await getDocs(noteQ);
  noteSnap.forEach(d => results.push({ ...d.data(), id: d.id, type: "note" }));
  // Similar for music...
  output.innerHTML = results.length ? results.map(r => `<div class="card"><p>${r.type.toUpperCase()}: ${escapeHtml(r.text || r.title)}</p></div>`).join("") : "<div class='muted'>Shadows hide it well.</div>";
}

/* ================= LIGHTBOX ================= */
const lightbox = document.getElementById("lightbox");
const lbContent = document.querySelector(".lightbox-content");
const lbCaption = document.querySelector(".lightbox-caption");
let lbItems = [], lbIndex = 0;

function initLightboxItems() {
  lbItems = [];
  document.querySelectorAll(".gallery-grid .card img, .gallery-grid .card video").forEach(el => {
    lbItems.push({
      url: el.src,
      type: el.tagName === "IMG" ? "image" : "video",
      caption: el.closest(".card").querySelector(".meta-left")?.textContent || ""
    });
  });
}

function openLightbox(url, caption, type) {
  initLightboxItems();
  lbIndex = lbItems.findIndex(i => i.url === url);
  if (lbIndex === -1) lbItems.push({ url, type, caption }), lbIndex = lbItems.length - 1;
  renderLB();
  lightbox.classList.add("active");
  document.body.style.overflow = "hidden";
}

function renderLB() {
  const item = lbItems[lbIndex];
  lbContent.innerHTML = item.type === "video" ? `<video src="${item.url}" controls autoplay playsinline></video>` : `<img src="${item.url}" alt="${item.caption}" loading="eager">`;
  lbCaption.textContent = item.caption;
  document.getElementById("prevBtn").onclick = () => { lbIndex = (lbIndex - 1 + lbItems.length) % lbItems.length; renderLB(); };
  document.getElementById("nextBtn").onclick = () => { lbIndex = (lbIndex + 1) % lbItems.length; renderLB(); };
}

function closeLB() {
  lightbox.classList.remove("active");
  document.body.style.overflow = "";
}
document.querySelector(".close").addEventListener("click", closeLB);
lightbox.addEventListener("click", e => e.target === lightbox && closeLB());
document.addEventListener("keydown", e => {
  if (lightbox.classList.contains("active")) {
    if (e.key === "Escape") closeLB();
    else if (e.key === "ArrowLeft") document.getElementById("prevBtn").click();
    else if (e.key === "ArrowRight") document.getElementById("nextBtn").click();
  }
});

/* ================= UTILS ================= */
async function deleteItem(id, type) {
  if (!confirm(`Dissolve this ${type}?`)) return;
  await deleteDoc(doc(collections[type], id));
  addToTimeline(`${type} released to the void`);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

/* ================= EXPORT ================= */
document.getElementById("exportDataBtn").addEventListener("click", async () => {
  const data = {};
  for (const [key, coll] of Object.entries(collections)) {
    if (key === "favorites" || key === "playlists" || key === "timeline") continue;
    const snap = await getDocs(query(coll));
    data[key] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `our-eternity-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  addToTimeline("Eternity bottled 📜");
});

/* ================= RENDER ALL ================= */
function renderAll() {
  renderTimeline();
  renderNotes();
  renderSavedMusic();
  renderGallery("photos", photoGallery, loadMorePhotos);
  renderGallery("videos", videoGallery, loadMoreVideos);
  renderEventsList();
  renderFavorites();
}

// Init after unlock
