// script.js - Complete, merged implementation: Auth, presence, user attribution, favorites, music options, iOS UX, map section

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, where, limit, startAfter, getDocs, getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

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
const analytics = getAnalytics(app);

const collections = {
  photos: collection(db, "photos"),
  videos: collection(db, "videos"),
  music: collection(db, "music"),
  notes: collection(db, "notes"),
  events: collection(db, "events"),
  timeline: collection(db, "timeline"),
  favorites: collection(db, "favorites"),
  playlists: collection(db, "playlists"),
  memories: collection(db, "memories")
};

let currentUser = null;
const USER_MAP = { 'brayden@love.com': 'Brayden', 'youna@love.com': 'Youna' };
const USERS = { brayden: 'brayden@love.com', youna: 'youna@love.com' };
const PASSWORDS = { brayden: 'love', youna: 'love' };

/* ================= AUTH & PRESENCE ================= */
const authModal = document.getElementById("authModal");
const braydenLogin = document.getElementById("braydenLogin");
const younaLogin = document.getElementById("younaLogin");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authError = document.getElementById("authError");
const braydenPresence = document.getElementById("braydenPresence");
const younaPresence = document.getElementById("younaPresence");

braydenLogin.addEventListener("click", () => {
  authEmail.value = USERS.brayden;
  authPassword.value = '';
  braydenLogin.classList.add("active");
  younaLogin.classList.remove("active");
});
younaLogin.addEventListener("click", () => {
  authEmail.value = USERS.youna;
  authPassword.value = '';
  younaLogin.classList.add("active");
  braydenLogin.classList.remove("active");
});

signInBtn.addEventListener("click", async () => {
  authError.textContent = '';
  try {
    currentUser = await signInWithEmailAndPassword(auth, authEmail.value, authPassword.value);
    setPresence(currentUser.user.uid, true);
    authModal.classList.remove("active");
    document.body.style.overflow = "";
    logoutBtn.style.display = "inline-flex";
    initApp();
  } catch (err) {
    authError.textContent = "The veil is thick—try again.";
  }
});

signUpBtn.addEventListener("click", async () => {
  authError.textContent = '';
  try {
    currentUser = await createUserWithEmailAndPassword(auth, authEmail.value, authPassword.value);
    setPresence(currentUser.user.uid, true);
    authModal.classList.remove("active");
    logoutBtn.style.display = "inline-flex";
    initApp();
  } catch (err) {
    authError.textContent = "A new path requires a true name.";
  }
});

logoutBtn.addEventListener("click", async () => {
  setPresence(currentUser.user.uid, false);
  await signOut(auth);
  currentUser = null;
  logoutBtn.style.display = "none";
  authModal.classList.add("active");
  document.body.style.overflow = "hidden";
  authEmail.focus();
});

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    setPresence(user.uid, true);
    logoutBtn.style.display = "inline-flex";
    if (authModal.classList.contains("active")) {
      authModal.classList.remove("active");
      document.body.style.overflow = "";
      initApp();
    }
  }
});

function setPresence(uid, online) {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  set(presenceRef, { online, timestamp: Date.now(), user: USER_MAP[currentUser?.email] || 'Unknown' });
  if (online) onDisconnect(presenceRef).set({ online: false, timestamp: Date.now(), user: USER_MAP[currentUser?.email] || 'Unknown' });
}

function listenPresence() {
  const braydenRef = ref(rtdb, `presence/${Object.keys(USER_MAP).find(email => USER_MAP[email] === 'Brayden')}`);
  const younaRef = ref(rtdb, `presence/${Object.keys(USER_MAP).find(email => USER_MAP[email] === 'Youna')}`);
  onValue(braydenRef, snap => {
    const data = snap.val();
    braydenPresence.textContent = data?.online ? "Brayden: Here" : "Brayden: Away";
    braydenPresence.className = `presence ${data?.online ? 'online' : 'offline'}`;
  });
  onValue(younaRef, snap => {
    const data = snap.val();
    younaPresence.textContent = data?.online ? "Youna: Here" : "Youna: Away";
    younaPresence.className = `presence ${data?.online ? 'online' : 'offline'}`;
  });
}

/* ================= DARK MODE ================= */
const darkModeToggle = document.getElementById("darkModeToggle");
darkModeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark", darkModeToggle.checked);
  localStorage.setItem("darkMode", darkModeToggle.checked);
});
const savedDark = localStorage.getItem("darkMode") === "true";
if (savedDark) {
  darkModeToggle.checked = true;
  document.body.classList.add("dark");
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
  listenPresence();
  document.addEventListener("click", handleDynamicClicks);
  showSection("photos");
  // iOS enhancements
  document.addEventListener('touchstart', function() {}, true); // Prevent double-tap zoom
  document.querySelectorAll("input, textarea, button").forEach(el => {
    el.addEventListener("touchstart", (e) => {
      e.currentTarget.style.transform = "scale(0.98)";
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      e.currentTarget.style.transform = "";
    }, { passive: true });
  });
  renderAll();
}

function showSection(id) {
  sections.forEach(s => s.id === id ? s.classList.add("active") : s.classList.remove("active"));
  navButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.section === id));
  currentSection = id;
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "favorites") renderFavorites();
  if (id === "map") initMap();
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

/* ================= UPLOAD & MEDIA ================= */
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

const photoInput = document.getElementById("photoInput");
const videoInput = document.getElementById("videoInput");
const photoGallery = document.getElementById("photoGallery");
const videoGallery = document.getElementById("videoGallery");
const loadMorePhotos = document.getElementById("loadMorePhotos");
const loadMoreVideos = document.getElementById("loadMoreVideos");

[photoInput, videoInput].forEach((input, idx) => input.addEventListener("change", e => handleFiles(e.target.files, idx === 0 ? "photos" : "videos")));

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
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  for (const file of Array.from(files)) {
    progressEl.style.width = "0%";
    const tempCard = makeTempCard(file, type.slice(0, -1));
    gallery.prepend(tempCard);
    try {
      const url = await uploadToCloudinary(file, progressEl);
      await addDoc(collections[type], { url, timestamp: serverTimestamp(), user });
      addToTimeline(`${type.slice(0, -1).toUpperCase()} enshrined by ${user} 💖`);
      tempCard.remove();
      await renderGallery(type, gallery, type === "photos" ? loadMorePhotos : loadMoreVideos);
      updateFavoriteButtons();
    } catch (err) {
      console.error(err);
      alert("A rift in the ether—try a smaller offering.");
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
  updateFavoriteButtons();
}

async function loadMoreMedia(type, galleryEl, loadMoreEl) {
  const q = query(collections[type], orderBy("timestamp", "desc"), startAfter(lastDoc[type]), limit(PAGE_SIZE));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => galleryEl.appendChild(makeMediaCard({ ...docSnap.data(), id: docSnap.id, type: type === "photos" ? "image" : "video" })));
  lastDoc[type] = snapshot.docs[snapshot.docs.length - 1];
  if (snapshot.docs.length < PAGE_SIZE) loadMoreEl.style.display = "none";
  updateFavoriteButtons();
  initLightboxItems();
}

function makeMediaCard({ url, id, type, timestamp, user }) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  const media = type === "image" ? document.createElement("img") : document.createElement("video");
  media.src = url;
  if (type === "video") { media.controls = false; media.preload = "metadata"; }
  wrapper.appendChild(media);
  const meta = document.createElement("div");
  meta.className = "card-meta";
  const date = timestamp?.toDate ? new Date(timestamp.toDate()).toLocaleDateString() : new Date().toLocaleDateString();
  meta.innerHTML = `
    <div class="meta-left">${date} <span class="user-tag">by ${user || 'Unknown'}</span></div>
    <div class="meta-actions">
      <button class="ghost" onclick="openLightbox('${url}', '${date} by ${user || 'Unknown'}', '${type}')">👁️</button>
      <button class="ghost" data-action="delete-item" data-id="${id}" data-type="${type.slice(0, -1)s}">🗑️</button>
    </div>
  `;
  wrapper.appendChild(meta);
  wrapper.addEventListener("click", e => { if (!e.target.closest("button")) openLightbox(url, date + ` by ${user || 'Unknown'}`, type); });
  const favBtn = document.createElement("button");
  favBtn.className = "favorite-btn";
  favBtn.dataset.id = id;
  favBtn.dataset.type = type;
  favBtn.innerHTML = "❤️";
  favBtn.addEventListener("click", e => { e.stopPropagation(); toggleFavorite(id, type, favBtn); });
  wrapper.appendChild(favBtn);
  return wrapper;
}

function makeTempCard(file, type) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  const media = file.type.startsWith("image/") ? document.createElement("img") : document.createElement("video");
  media.src = URL.createObjectURL(file);
  media.style.filter = "blur(3px) brightness(0.8)";
  if (media.tagName === "VIDEO") { media.muted = true; media.loop = true; }
  wrapper.appendChild(media);
  wrapper.innerHTML += `<div class="card-meta"><div class="meta-left">Weaving magic... ✨</div></div>`;
  return wrapper;
}

/* ================= MUSIC ================= */
const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicSearchResults = document.getElementById("musicSearchResults");
const savedMusic = document.getElementById("savedMusic");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");

addMusicBtn.addEventListener("click", searchMusic);
musicInput.addEventListener("keypress", e => e.key === "Enter" && searchMusic());
createPlaylistBtn.addEventListener("click", createPlaylist);

async function searchMusic() {
  const q = musicInput.value.trim();
  if (!q) return;
  musicSearchResults.innerHTML = "<div class='muted'>Tuning the cosmos...</div>";
  try {
    const res = await fetch(`https://love-site-spotify-backend.vercel.app/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    musicSearchResults.innerHTML = "";
    data.slice(0, 12).forEach(track => musicSearchResults.appendChild(createMusicItem(track, null, false)));
  } catch (err) {
    console.error(err);
    musicSearchResults.innerHTML = "<div class='muted'>The muses are elusive—try another invocation.</div>";
  }
}

function createMusicItem(track, id = null, saved = false) {
  const root = document.createElement("div");
  root.className = "musicItem card";
  const user = saved ? (track.user || 'Unknown') : '';
  root.innerHTML = `
    <img src="${track.album?.images?.[0]?.url || 'https://via.placeholder.com/340x200?text=♪'}" alt="${track.name}" loading="lazy">
    <div class="info">
      <p class="music-title">${escapeHtml(track.name)}</p>
      <p>${escapeHtml(track.artists?.map(a => a.name).join(', '))}</p>
      ${track.preview_url ? `<audio controls src="${track.preview_url}" style="width:100%; margin:10px 0;" playsinline></audio>` : ''}
      ${saved && user ? `<p class="user-tag">by ${user}</p>` : ''}
      <div class="musicButtons">
        <a href="${track.external_urls?.spotify}" target="_blank" rel="noopener" class="ghost">▶️ Spotify</a>
        <a href="https://www.deezer.com/search?q=${encodeURIComponent(track.name + ' ' + track.artists[0].name)}" target="_blank" rel="noopener" class="ghost">🎵 Deezer</a>
        ${saved ? `<button class="ghost" data-action="remove-music" data-id="${id}">✗</button>` : `<button class="primary" data-action="add-music" data-track='${JSON.stringify(track).replace(/'/g, "\\'")}'>+ Enshrine</button>`}
      </div>
    </div>
    <button class="favorite-btn" data-id="${track.id || id}" data-type="music">❤️</button>
  `;
  return root;
}

window.addMusic = async (track) => {
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  await addDoc(collections.music, { ...track, timestamp: serverTimestamp(), user });
  addToTimeline(`Harmony embraced by ${user}: ${track.name} 🎶`);
  musicSearchResults.innerHTML = "<div class='muted'>A new verse in our symphony ✨</div>";
  renderSavedMusic();
  updateFavoriteButtons();
};

window.removeMusic = async (id) => {
  if (!confirm("Release this cadence?")) return;
  await deleteDoc(doc(collections.music, id));
  addToTimeline("A melody fades into memory");
};

function renderSavedMusic() {
  const q = query(collections.music, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    savedMusic.innerHTML = snapshot.empty ? "<div class='muted'>The archives yearn for song...</div>" : "";
    snapshot.forEach(docSnap => savedMusic.appendChild(createMusicItem(docSnap.data(), docSnap.id, true)));
    updateFavoriteButtons();
  });
}

async function createPlaylist() {
  const name = prompt("Name this celestial score?");
  if (!name) return;
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  await addDoc(collections.playlists, { name, tracks: [], timestamp: serverTimestamp(), user });
  addToTimeline(`Score composed by ${user}: ${name} 🎼`);
}

/* ================= NOTES & VOICE ================= */
const noteInput = document.getElementById("noteInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const notesList = document.getElementById("notesList");

saveNoteBtn.addEventListener("click", async () => {
  const text = noteInput.value.trim();
  if (!text) return noteInput.focus();
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  await addDoc(collections.notes, { text, timestamp: serverTimestamp(), user });
  addToTimeline(`Confession veiled by ${user} ✍️`);
  noteInput.value = "";
});

let mediaRecorder, audioChunks = [];
const voiceModal = document.getElementById("voiceModal");
const startRecord = document.getElementById("startRecord");
const stopRecord = document.getElementById("stopRecord");
const voicePreview = document.getElementById("voicePreview");
const saveVoiceBtn = document.getElementById("voicePreview");
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
    alert("The winds are silent—check your voice.");
  }
});

stopRecord.addEventListener("click", () => {
  mediaRecorder.stop();
  startRecord.disabled = false;
  stopRecord.disabled = true;
});

saveVoiceBtn.addEventListener("click", async () => {
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  const blob = new Blob(audioChunks, { type: 'audio/wav' });
  try {
    const url = await uploadToCloudinary(blob, null);
    await addDoc(collections.notes, { text: "[Echo from the depths]", audioUrl: url, timestamp: serverTimestamp(), user });
    addToTimeline(`Whisper eternalized by ${user} 🎤`);
    voiceModal.classList.remove("active");
    voicePreview.style.display = "none";
    saveVoiceBtn.disabled = true;
  } catch (err) { console.error(err); }
});

function renderNotes() {
  const q = query(collections.notes, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    notesList.innerHTML = snapshot.empty ? "<div class='muted'>The pages await your ink...</div>" : "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "note-card card";
      const when = data.timestamp?.toDate?.()?.toLocaleDateString() ?? "Timeless";
      card.innerHTML = `
        <div class="info">
          <strong style="color: var(--accent);">${when} <span class="user-tag">by ${data.user || 'Unknown'}</span></strong>
          <p style="font-style: italic; font-family: var(--font-serif);">${escapeHtml(data.text)}</p>
          ${data.audioUrl ? `<audio controls src="${data.audioUrl}" playsinline></audio>` : ''}
          <button class="ghost" data-action="delete-note" data-id="${docSnap.id}">🗑️</button>
        </div>
        <button class="favorite-btn" data-id="${docSnap.id}" data-type="notes">❤️</button>
      `;
      notesList.appendChild(card);
    });
    updateFavoriteButtons();
  });
}

window.deleteNote = async (id) => {
  if (!confirm("Unveil this confession?")) return;
  await deleteDoc(doc(collections.notes, id));
  addToTimeline("A veil lifted");
};

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
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    const div = document.createElement("div");
    div.className = "calendar-day header";
    div.textContent = day;
    div.style.fontWeight = "500";
    calendarGrid.appendChild(div);
  });
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
    div.addEventListener("click", () => showEventForm(div.dataset.date));
    calendarGrid.appendChild(div);
  }
  renderEventsOnCalendar();
}

function renderEventsOnCalendar() {
  getDocs(query(collections.events, where("date", ">=", `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`))).then(snapshot => {
    const eventsByDate = {};
    snapshot.forEach(d => eventsByDate[d.data().date] = (eventsByDate[d.data().date] || 0) + 1);
    document.querySelectorAll(".calendar-day:not(.header):not(.empty)").forEach(day => {
      const dateStr = day.dataset.date;
      if (eventsByDate[dateStr]) {
        day.classList.add("has-event");
        day.querySelector(".events-mini").textContent = eventsByDate[dateStr];
      }
    });
  });
}

function showEventForm(dateStr) {
  document.getElementById("formTitle").textContent = "Invoke Alignment";
  document.getElementById("eventDate").value = dateStr;
  eventForm.style.display = "block";
  eventForm.scrollIntoView({ behavior: "smooth" });
}

function hideEventForm() {
  eventForm.style.display = "none";
  eventForm.querySelectorAll("input, textarea").forEach(el => el.value = "");
}

window.saveEvent = async () => {
  const title = document.getElementById("eventTitle").value.trim();
  const desc = document.getElementById("eventDesc").value.trim();
  const date = document.getElementById("eventDate").value;
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  if (!title || !date) return alert("A prophecy needs form and fate.");
  await addDoc(collections.events, { title, desc, date, timestamp: serverTimestamp(), user });
  addToTimeline(`Alignment invoked by ${user}: ${title} on ${date} 🌟`);
  hideEventForm();
  renderEventsList();
  renderCalendar();
  updateFavoriteButtons();
};

function renderEventsList() {
  const q = query(collections.events, orderBy("date"));
  onSnapshot(q, snapshot => {
    eventsList.innerHTML = snapshot.empty ? "<div class='muted'>The stars hold their breath...</div>" : "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "event-card card";
      card.innerHTML = `
        <div class="info">
          <strong style="color: var(--accent);">${data.date} – ${escapeHtml(data.title)} <span class="user-tag">by ${data.user || 'Unknown'}</span></strong>
          <p>${escapeHtml(data.desc)}</p>
          <button class="ghost" data-action="delete-item" data-id="${docSnap.id}" data-type="events">🗑️</button>
        </div>
        <button class="favorite-btn" data-id="${docSnap.id}" data-type="events">❤️</button>
      `;
      eventsList.appendChild(card);
    });
    updateFavoriteButtons();
  });
}

/* ================= MAP ================= */
let map, memoryMarkers = [];
const memoryModal = document.getElementById("memoryModal");
const addMemoryBtn = document.getElementById("addMemoryBtn");
const memoriesList = document.getElementById("memoriesList");
const getCurrentLocation = document.getElementById("getCurrentLocation");
const saveMemoryBtn = document.getElementById("saveMemoryBtn");
const cancelMemoryBtn = document.getElementById("cancelMemoryBtn");

addMemoryBtn.addEventListener("click", () => memoryModal.classList.add("active"));
cancelMemoryBtn.addEventListener("click", () => memoryModal.classList.remove("active"));
getCurrentLocation.addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      document.getElementById("latInput").value = pos.coords.latitude;
      document.getElementById("lngInput").value = pos.coords.longitude;
    });
  }
});

saveMemoryBtn.addEventListener("click", async () => {
  const title = document.getElementById("memoryTitle").value.trim();
  const desc = document.getElementById("memoryDesc").value.trim();
  const lat = parseFloat(document.getElementById("latInput").value);
  const lng = parseFloat(document.getElementById("lngInput").value);
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  if (!title || !lat || !lng) return alert("A memory needs a tale and a place.");
  await addDoc(collections.memories, { title, desc, lat, lng, timestamp: serverTimestamp(), user });
  addToTimeline(`Memory anchored by ${user}: ${title} at ${lat.toFixed(4)}, ${lng.toFixed(4)} 📍`);
  memoryModal.classList.remove("active");
  renderMemories();
});

function initMap() {
  if (map) return;
  // Load Leaflet CSS/JS dynamically
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = () => {
    map = L.map('mapContainer').setView([37.7749, -122.4194], 13); // Default to SF
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    renderMemories();
  };
  document.head.appendChild(script);
}

function renderMemories() {
  const q = query(collections.memories, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    // Clear markers
    memoryMarkers.forEach(marker => map.removeLayer(marker));
    memoryMarkers = [];
    memoriesList.innerHTML = snapshot.empty ? "<div class='muted'>The map awaits your pins...</div>" : "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const marker = L.marker([data.lat, data.lng]).addTo(map).bindPopup(`
        <b>${escapeHtml(data.title)}</b><br>
        ${escapeHtml(data.desc)}<br>
        <em>by ${data.user || 'Unknown'}</em>
      `);
      memoryMarkers.push(marker);
      const card = document.createElement("div");
      card.className = "memory-card card";
      const when = data.timestamp?.toDate?.()?.toLocaleString() ?? "Timeless";
      card.innerHTML = `
        <div class="info">
          <strong style="color: var(--accent);">${when} <span class="user-tag">by ${data.user || 'Unknown'}</span></strong>
          <p>${escapeHtml(data.title)} – ${escapeHtml(data.desc)}</p>
          <p>📍 ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}</p>
          <button class="ghost" data-action="delete-item" data-id="${docSnap.id}" data-type="memories">🗑️</button>
        </div>
        <button class="favorite-btn" data-id="${docSnap.id}" data-type="memories">❤️</button>
      `;
      memoriesList.appendChild(card);
      updateFavoriteButtons();
    });
    if (memoryMarkers.length > 0) {
      map.fitBounds(memoryMarkers.map(m => m.getLatLng()), { padding: [20, 20] });
    }
  });
}

/* ================= TIMELINE ================= */
async function addToTimeline(action, type = "milestone") {
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  try {
    await addDoc(collections.timeline, { action: `${action} by ${user}`, type, timestamp: serverTimestamp() });
  } catch (err) { console.error("Timeline rift:", err); }
}

function renderTimeline() {
  const list = document.getElementById("timelineList");
  const q = query(collections.timeline, orderBy("timestamp", "desc"), limit(PAGE_SIZE * 2));
  onSnapshot(q, snapshot => {
    list.innerHTML = snapshot.empty ? "<div class='muted'>The saga begins in silence...</div>" : "";
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

/* ================= FAVORITES ================= */
let favorites = new Map(); // type_id -> favDocId

onSnapshot(collections.favorites, snap => {
  favorites.clear();
  snap.forEach(d => {
    const data = d.data();
    favorites.set(`${data.type}_${data.itemId}`, d.id);
  });
  renderFavorites();
  updateFavoriteButtons();
});

function updateFavoriteButtons() {
  document.querySelectorAll(".favorite-btn").forEach(btn => {
    const key = `${btn.dataset.type}_${btn.dataset.id}`;
    btn.classList.toggle("active", favorites.has(key));
  });
}

async function toggleFavorite(id, type, el) {
  const key = `${type}_${id}`;
  const user = USER_MAP[currentUser?.email] || 'Unknown';
  if (favorites.has(key)) {
    await deleteDoc(doc(db, "favorites", favorites.get(key)));
  } else {
    await addDoc(collections.favorites, { itemId: id, type, timestamp: serverTimestamp(), user });
  }
  addToTimeline(`${type} enshrined by ${user} ❤️`);
}

async function renderFavorites() {
  const list = document.getElementById("favoritesList");
  if (!favorites.size) {
    list.innerHTML = "<div class='muted'>The vault awaits your treasures...</div>";
    return;
  }
  list.innerHTML = "<div class='muted'>Illuminating the sanctum...</div>";
  const favItems = [];
  for (const [key, favId] of favorites) {
    const [type, itemId] = key.split("_");
    const itemDoc = await getDoc(doc(db, type === "events" ? collections.events : collections[type === "memories" ? "memories" : type], itemId));
    if (itemDoc.exists()) {
      const data = itemDoc.data();
      favItems.push({ ...data, id: itemId, type });
    }
  }
  list.innerHTML = "";
  favItems.forEach(item => {
    if (item.type === "photos" || item.type === "videos") {
      const card = makeMediaCard({ ...item, type: item.type === "photos" ? "image" : "video" });
      list.appendChild(card);
    } else if (item.type === "music") {
      list.appendChild(createMusicItem(item, item.id, true));
    } else if (item.type === "notes") {
      const card = document.createElement("div");
      card.className = "note-card card";
      const when = item.timestamp?.toDate?.()?.toLocaleDateString() ?? "Timeless";
      card.innerHTML = `
        <div class="info">
          <strong style="color: var(--accent);">${when} <span class="user-tag">by ${item.user || 'Unknown'}</span></strong>
          <p style="font-style: italic; font-family: var(--font-serif);">${escapeHtml(item.text)}</p>
          ${item.audioUrl ? `<audio controls src="${item.audioUrl}" playsinline></audio>` : ''}
        </div>
      `;
      list.appendChild(card);
    } else if (item.type === "events") {
      const card = document.createElement("div");
      card.className = "event-card card";
      card.innerHTML = `
        <div class="info">
          <strong style="color: var(--accent);">${item.date} – ${escapeHtml(item.title)} <span class="user-tag">by ${item.user || 'Unknown'}</span></strong>
          <p>${escapeHtml(item.desc)}</p>
        </div>
      `;
      list.appendChild(card);
    } else if (item.type === "memories") {
      const card = document.createElement("div");
      card.className = "memory-card card";
      const when = item.timestamp?.toDate?.()?.toLocaleString() ?? "Timeless";
      card.innerHTML = `
        <div class="info">
          <strong style="color: var(--accent);">${when} <span class="user-tag">by ${item.user || 'Unknown'}</span></strong>
          <p>${escapeHtml(item.title)} – ${escapeHtml(item.desc)}</p>
          <p>📍 ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}</p>
        </div>
      `;
      list.appendChild(card);
    }
  });
  initLightboxItems();
  updateFavoriteButtons();
}

/* ================= GLOBAL SEARCH ================= */
async function handleGlobalSearch() {
  const term = document.getElementById("globalSearch").value.trim().toLowerCase();
  if (!term) return showSection(currentSection);
  showSection("searchResults");
  const output = document.getElementById("globalSearchOutput");
  output.innerHTML = "<div class='muted'>Peering into the abyss...</div>";
  const results = [];
  // Notes
  const noteQ = query(collections.notes, where("text", ">=", term), where("text", "<=", term + "\uf8ff"), limit(5));
  const noteSnap = await getDocs(noteQ);
  noteSnap.forEach(d => results.push({ ...d.data(), id: d.id, type: "note" }));
  // Music (title/artist)
  const musicQ = query(collections.music, where("name", ">=", term), where("name", "<=", term + "\uf8ff"), limit(5));
  const musicSnap = await getDocs(musicQ);
  musicSnap.forEach(d => results.push({ ...d.data(), id: d.id, type: "music" }));
  // Events
  const eventQ = query(collections.events, where("title", ">=", term), where("title", "<=", term + "\uf8ff"), limit(5));
  const eventSnap = await getDocs(eventQ);
  eventSnap.forEach(d => results.push({ ...d.data(), id: d.id, type: "event" }));
  output.innerHTML = results.length ? results.map(r => {
    let preview = '';
    if (r.type === "note") preview = escapeHtml(r.text?.slice(0, 100)) + '...';
    else if (r.type === "music") preview = escapeHtml(r.name || r.title);
    else if (r.type === "event") preview = escapeHtml(r.title);
    return `<div class="card"><p><strong>${r.type.toUpperCase()}:</strong> ${preview}</p></div>`;
  }).join("") : "<div class='muted'>The ether conceals it...</div>";
}

/* ================= LIGHTBOX ================= */
const lightbox = document.getElementById("lightbox");
const lbContent = document.querySelector(".lightbox-content");
const lbCaption = document.querySelector(".lightbox-caption");
let lbItems = [], lbIndex = 0;

function initLightboxItems() {
  lbItems = [];
  document.querySelectorAll(".gallery-grid .card img, .gallery-grid .card video, #favoritesList .card img, #favoritesList .card video").forEach(el => {
    lbItems.push({
      url: el.src,
      type: el.tagName === "IMG" ? "image" : "video",
      caption: el.closest(".card").querySelector(".meta-left")?.textContent || ""
    });
  });
}

window.openLightbox = (url, caption, type) => {
  initLightboxItems();
  lbIndex = lbItems.findIndex(i => i.url === url);
  if (lbIndex === -1) lbItems.push({ url, type, caption }), lbIndex = lbItems.length - 1;
  renderLB();
  lightbox.classList.add("active");
  document.body.style.overflow = "hidden";
};

function renderLB() {
  const item = lbItems[lbIndex];
  lbContent.innerHTML = item.type === "video"
    ? `<video src="${item.url}" controls autoplay playsinline></video>`
    : `<img src="${item.url}" alt="${item.caption}" loading="eager">`;
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
    if (e.key === "ArrowLeft") document.getElementById("prevBtn").click();
    if (e.key === "ArrowRight") document.getElementById("nextBtn").click();
  }
});

/* ================= DYNAMIC CLICKS ================= */
function handleDynamicClicks(e) {
  const target = e.target;
  if (target.matches(".favorite-btn")) {
    e.stopPropagation();
    toggleFavorite(target.dataset.id, target.dataset.type, target);
  } else if (target.matches("[data-action='add-music']")) {
    addMusic(JSON.parse(target.dataset.track));
  } else if (target.matches("[data-action='remove-music']")) {
    removeMusic(target.dataset.id);
  } else if (target.matches("[data-action='delete-note']")) {
    deleteNote(target.dataset.id);
  } else if (target.matches("[data-action='delete-item']")) {
    deleteItem(target.dataset.id, target.dataset.type);
  } else if (target.matches(".calendar-day:not(.header):not(.empty)")) {
    showEventForm(target.dataset.date);
  } else if (target.matches("#saveEventBtn")) {
    saveEvent();
  } else if (target.matches("#cancelEventBtn")) {
    hideEventForm();
  }
}

/* ================= UTILS ================= */
window.deleteItem = async (id, type) => {
  if (!confirm(`Dissolve this ${type}?`)) return;
  await deleteDoc(doc(collections[type], id));
  addToTimeline(`${type} returned to the void`);
  if (type === "photos" || type === "videos") {
    document.querySelector(`[data-id="${id}"]`)?.closest(".card")?.remove();
  }
  if (type === "memories") renderMemories();
  renderFavorites(); // Refresh if needed
};

function escapeHtml(str) {
  return str?.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]) || '';
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
  addToTimeline("Eternity sealed in amber 📜");
});

/* ================= RENDER ALL ================= */
async function renderAll() {
  renderTimeline();
  renderNotes();
  renderSavedMusic();
  await renderGallery("photos", photoGallery, loadMorePhotos);
  await renderGallery("videos", videoGallery, loadMoreVideos);
  renderEventsList();
  renderFavorites();
  renderCalendar();
}

/* ================= START ================= */
document.addEventListener("DOMContentLoaded", () => {
  braydenLogin.click();
  authModal.classList.add("active");
  document.body.style.overflow = "hidden";
  authEmail.focus();
  darkModeToggle.checked = document.body.classList.contains("dark");
});
