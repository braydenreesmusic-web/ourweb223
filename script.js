// script.js (ES module)
// Polished, accessible, drag/drop, improved lightbox, Firestore delete fix,
// clearer music flow, and small UX improvements.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

/* ================= FIREBASE CONFIG (same project keys you provided) ================= */
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

/* ================= CLOUDINARY UPLOAD (unsigned preset) ================= */
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "unsigned_upload";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url;
}

/* ================= DOM references ================= */
const navButtons = document.querySelectorAll(".nav-btn");
const panels = document.querySelectorAll(".panel");
const MAX_GALLERY_LOAD = 200;

function showSection(id) {
  panels.forEach(p => p.id === id ? p.classList.add("section-active") : p.classList.remove("section-active"));
  navButtons.forEach(btn => {
    const pressed = btn.dataset.section === id;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    btn.classList.toggle("active", pressed);
  });
  // move focus to panel heading for accessibility
  const heading = document.querySelector(`#${id} h2`);
  if (heading) heading.focus?.();
}

navButtons.forEach(b => b.addEventListener("click", () => showSection(b.dataset.section)));
showSection("photos"); // default

/* ================= Collections map ================= */
const collectionsMap = {
  photos: collection(db, "photos"),
  videos: collection(db, "videos"),
  music: collection(db, "music"),
  notes: collection(db, "notes"),
  timeline: collection(db, "timeline")
};

async function addToTimeline(action) {
  try {
    await addDoc(collectionsMap.timeline, { action, timestamp: serverTimestamp() });
  } catch (err) {
    console.error("Timeline entry failed", err);
  }
}

/* ================= TIMELINE ================= */
const timelineList = document.getElementById("timelineList");
function renderTimeline() {
  const q = query(collectionsMap.timeline, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    timelineList.innerHTML = "";
    let count = 0;
    snapshot.forEach(doc => {
      if (count++ > 200) return; // safety
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "note-card";
      const when = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : "Just now";
      div.innerHTML = `<strong>${when}</strong><div>${escapeHtml(String(data.action || ""))}</div>`;
      timelineList.appendChild(div);
    });
    if (!snapshot.size) timelineList.innerHTML = "<div class='muted'>No timeline events yet.</div>";
  });
}

/* ================= PHOTOS (drag/drop + upload + gallery + improved lightbox binding) ================= */
const photoInput = document.getElementById("photoInput");
const photoBrowse = document.getElementById("photoBrowse");
const photoDrop = document.getElementById("photoDrop");
const photoGallery = document.getElementById("photoGallery");

photoBrowse.addEventListener("click", () => photoInput.click());
photoInput.addEventListener("change", handlePhotoFiles);

enableDrop(photoDrop, handleFilesByType);

/* Render photos from Firestore */
onSnapshot(collection(db, "photos"), snapshot => {
  photoGallery.innerHTML = "";
  if (snapshot.empty) {
    photoGallery.innerHTML = "<div class='muted'>No photos yet 💔</div>";
    return;
  }
  snapshot.forEach(doc => {
    const data = doc.data();
    const url = data.url;
    if (!url) return;
    const card = makeMediaCard({ url, id: doc.id, type: "image", timestamp: data.timestamp });
    photoGallery.appendChild(card);
  });
  initLightboxItems();
});

/* ================= VIDEOS ================= */
const videoInput = document.getElementById("videoInput");
const videoBrowse = document.getElementById("videoBrowse");
const videoDrop = document.getElementById("videoDrop");
const videoGallery = document.getElementById("videoGallery");

videoBrowse?.addEventListener("click", () => videoInput.click());
videoInput?.addEventListener("change", handleVideoFiles);

enableDrop(videoDrop, handleFilesByType);

onSnapshot(collection(db, "videos"), snapshot => {
  videoGallery.innerHTML = "";
  if (snapshot.empty) {
    videoGallery.innerHTML = "<div class='muted'>No videos yet 💔</div>";
    return;
  }
  snapshot.forEach(doc => {
    const data = doc.data();
    const url = data.url;
    if (!url) return;
    const card = makeMediaCard({ url, id: doc.id, type: "video", timestamp: data.timestamp });
    videoGallery.appendChild(card);
  });
  initLightboxItems();
});

/* ================= Generic file handlers ================= */
function handlePhotoFiles(e) {
  const file = (e?.target?.files && e.target.files[0]) || null;
  if (!file) return;
  processFileUpload(file, "photos", "Photo added 💖");
}
function handleVideoFiles(e) {
  const file = (e?.target?.files && e.target.files[0]) || null;
  if (!file) return;
  processFileUpload(file, "videos", "Video added 🎥");
}

async function handleFilesByType(file, typeHint) {
  // used by drop handlers: detect if image/video and route accordingly
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (isImage) {
    await processFileUpload(file, "photos", "Photo added 💖");
  } else if (isVideo) {
    await processFileUpload(file, "videos", "Video added 🎥");
  } else {
    alert("Unsupported file type.");
  }
}

async function processFileUpload(file, collectionKey, timelineText) {
  try {
    // small UX: show placeholder card while uploading
    const temp = makeTempCard(file);
    if (collectionKey === "photos") photoGallery.prepend(temp);
    else videoGallery.prepend(temp);

    const url = await uploadToCloudinary(file);
    await addDoc(collectionsMap[collectionKey], { url, timestamp: serverTimestamp() });
    addToTimeline(timelineText);
    temp.remove();
  } catch (err) {
    console.error("Upload failed", err);
    alert("Upload failed. Try a smaller file or check your network.");
  }
}

/* ================= Drag & Drop utility ================= */
function enableDrop(dropEl, onFile) {
  dropEl.addEventListener("dragover", e => {
    e.preventDefault();
    dropEl.classList.add("dragover");
  });
  dropEl.addEventListener("dragleave", () => dropEl.classList.remove("dragover"));
  dropEl.addEventListener("drop", async e => {
    e.preventDefault();
    dropEl.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files || []);
    for (const file of files) { await onFile(file); }
  });

  // support keyboard "Enter" to trigger browse
  dropEl.addEventListener("keypress", e => {
    if (e.key === "Enter" || e.key === " ") {
      // attempt to open related input
      const type = dropEl.dataset.type;
      if (type === "image") photoInput.click();
      else if (type === "video") videoInput.click();
    }
  });
}

/* ================= Make media card DOM ================= */
function makeMediaCard({ url, id, type }) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  wrapper.tabIndex = 0;
  // preview (img or video)
  if (type === "image") {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Cherished photo";
    img.loading = "lazy";
    wrapper.appendChild(img);
  } else {
    const vid = document.createElement("video");
    vid.src = url;
    vid.controls = false;
    vid.preload = "metadata";
    vid.setAttribute("aria-label", "Video preview");
    wrapper.appendChild(vid);
  }

  const meta = document.createElement("div");
  meta.className = "card-meta";
  const left = document.createElement("div");
  left.className = "meta-left";
  left.textContent = new Date().toLocaleString();
  const actions = document.createElement("div");
  actions.className = "meta-actions";

  // view button
  const viewBtn = document.createElement("button");
  viewBtn.className = "ghost";
  viewBtn.textContent = "Preview";
  viewBtn.addEventListener("click", () => openLightbox(url, type));

  // delete button
  const removeBtn = document.createElement("button");
  removeBtn.className = "ghost";
  removeBtn.textContent = "Delete";
  removeBtn.addEventListener("click", async () => {
    if (!confirm("Delete this item? This cannot be undone in UI.")) return;
    try {
      // delete via deleteDoc using doc reference id
      const docRef = collection(db, collectionForType(type)).doc ? undefined : null; // no-op, we won't use that branch
      // Since we have doc id in card, we can call deleteDoc on a doc reference using doc() helper,
      // but to avoid importing doc() unnecessarily we will use a lightweight pattern: reconstruct ref via collection + id by using deleteDoc on a DocumentReference:
      // create a DocumentReference with same path using collection(db, 'photos') then doc id
      // Importing doc() is small; instead, use deleteDoc from firestore with a DocumentReference created via collection(db,'...').withConverter? Simpler: import doc when needed.
    } catch (err) {
      console.error(err);
    }
  });

  // We'll attach a dataset value so delete logic can find doc id
  // (note: the real doc id is only available when rendering from Firestore; temporary upload cards won't have it)
  if (id) {
    wrapper.dataset.docId = id;
    wrapper.dataset.type = type;
    removeBtn.addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      try {
        // import doc now (dynamic) to create reference
        const { doc } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
        const docRef = doc(db, collectionForType(type), id);
        await deleteDoc(docRef);
        addToTimeline(`${type[0].toUpperCase() + type.slice(1)} removed`);
        wrapper.remove();
      } catch (err) {
        console.error("Failed to delete:", err);
        alert("Failed to remove item. Check console.");
      }
    });
  } else {
    // hide delete for temp
    removeBtn.setAttribute("aria-hidden", "true");
    removeBtn.style.display = "none";
  }

  actions.appendChild(viewBtn);
  actions.appendChild(removeBtn);
  meta.append(left, actions);
  wrapper.appendChild(meta);

  // clicking image/video also opens lightbox
  wrapper.addEventListener("click", (ev) => {
    // avoid clicks from the buttons triggering the preview again
    if (ev.target.tagName.toLowerCase() === "button") return;
    openLightbox(url, type);
  });

  return wrapper;
}

function collectionForType(type) {
  if (type === "image" || type === "photo" || type === "photos") return "photos";
  if (type === "video" || type === "videos") return "videos";
  return type;
}

/* Make temporary placeholder card for uploading feedback */
function makeTempCard(file) {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  wrapper.tabIndex = -1;
  const preview = document.createElement(file.type.startsWith("image/") ? "img" : "video");
  if (file.type.startsWith("image/")) {
    preview.src = URL.createObjectURL(file);
    preview.alt = file.name;
  } else {
    preview.src = URL.createObjectURL(file);
    preview.muted = true;
    preview.autoplay = true;
    preview.loop = true;
  }
  preview.style.filter = "blur(4px) saturate(.9)";
  preview.loading = "lazy";
  wrapper.appendChild(preview);
  const meta = document.createElement("div");
  meta.className = "card-meta";
  const left = document.createElement("div");
  left.className = "meta-left";
  left.textContent = "Uploading…";
  meta.append(left, document.createElement("div"));
  wrapper.appendChild(meta);
  return wrapper;
}

/* ================= LIGHTBOX (improved, keyboard nav, accessible) ================= */
const lightbox = document.getElementById("lightbox");
const lbContent = document.getElementById("lbContent");
const lbClose = document.getElementById("lbClose");
const lbPrev = document.getElementById("lbPrev");
const lbNext = document.getElementById("lbNext");

let lbItems = []; // array of {url,type,el}
let lbIndex = -1;

function initLightboxItems() {
  // gather media cards in order
  lbItems = [];
  const photoCards = Array.from(photoGallery.querySelectorAll(".card")).map(el => ({ el, url: el.querySelector("img")?.src || el.querySelector("video")?.src, type: el.querySelector("img") ? "image" : "video" }));
  const videoCards = Array.from(videoGallery.querySelectorAll(".card")).map(el => ({ el, url: el.querySelector("img")?.src || el.querySelector("video")?.src, type: el.querySelector("img") ? "image" : "video" }));
  // maintain gallery order: photos first then videos
  lbItems = [...photoCards, ...videoCards];
}

function openLightbox(url, type) {
  // populate items if not already
  if (!lbItems.length) initLightboxItems();

  lbIndex = lbItems.findIndex(i => i.url === url);
  if (lbIndex < 0) {
    // fallback - just show this single item
    lbItems.push({ url, type });
    lbIndex = lbItems.length - 1;
  }

  renderLB();
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden"; // prevent background scroll
  lbClose.focus();
}

function renderLB() {
  lbContent.innerHTML = "";
  const item = lbItems[lbIndex];
  if (!item) return;
  if (item.type === "video") {
    const v = document.createElement("video");
    v.src = item.url;
    v.controls = true;
    v.autoplay = true;
    v.setAttribute("playsinline", "");
    lbContent.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = "Preview";
    lbContent.appendChild(img);
  }
  // update prev/next visibility
  lbPrev.disabled = lbIndex <= 0;
  lbNext.disabled = lbIndex >= lbItems.length - 1;
}

lbClose.addEventListener("click", closeLB);
lbPrev.addEventListener("click", () => { lbIndex = Math.max(0, lbIndex - 1); renderLB(); });
lbNext.addEventListener("click", () => { lbIndex = Math.min(lbItems.length - 1, lbIndex + 1); renderLB(); });

function closeLB() {
  lightbox.setAttribute("aria-hidden", "true");
  lbContent.innerHTML = "";
  document.body.style.overflow = "";
  lbIndex = -1;
}

/* Keyboard support for lightbox */
document.addEventListener("keydown", (e) => {
  if (lightbox.getAttribute("aria-hidden") === "false") {
    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowLeft") lbPrev.click();
    if (e.key === "ArrowRight") lbNext.click();
  }
});

/* Click outside content to close */
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLB();
});

/* Init gallery click bindings (for dynamic items) */
function initGalleryClicks() {
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    // do not open lightbox if click was on a button inside card
    if (e.target.tagName.toLowerCase() === "button") return;
    const url = card.querySelector("img")?.src || card.querySelector("video")?.src;
    const type = card.querySelector("img") ? "image" : "video";
    if (url) openLightbox(url, type);
  });
}
initGalleryClicks();

/* ================= NOTES ================= */
const noteInput = document.getElementById("noteInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const clearNoteBtn = document.getElementById("clearNote");
const notesList = document.getElementById("notesList");

function renderNotes() {
  const q = query(collectionsMap.notes, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    notesList.innerHTML = "";
    if (snapshot.empty) {
      notesList.innerHTML = "<div class='muted'>No notes yet.</div>";
      return;
    }
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "note-card";
      const when = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : "Just now";
      div.innerHTML = `<strong>${when}</strong><div style="margin-top:6px">${escapeHtml(String(data.text || ""))}</div>`;
      notesList.appendChild(div);
    });
  });
}

saveNoteBtn.addEventListener("click", async () => {
  const text = (noteInput.value || "").trim();
  if (!text) { alert("Please write something first."); return; }
  try {
    await addDoc(collectionsMap.notes, { text, timestamp: serverTimestamp() });
    addToTimeline("Note added ✍️");
    noteInput.value = "";
  } catch (err) {
    console.error("Failed to save note", err);
    alert("Failed to save note.");
  }
});
clearNoteBtn.addEventListener("click", () => noteInput.value = "");

/* ================= MUSIC (search + save + delete) ================= */
const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const clearSearchBtn = document.getElementById("clearSearch");
const searchResults = document.getElementById("searchResults");
const savedMusic = document.getElementById("savedMusic");

async function renderSavedMusic() {
  const q = query(collectionsMap.music, orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    savedMusic.innerHTML = "";
    if (snapshot.empty) { savedMusic.innerHTML = "<div class='muted'>No saved tracks yet.</div>"; return; }
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      const item = createMusicItem(data, id, true);
      savedMusic.appendChild(item);
    });
  });
}

function createMusicItem(track, id = null, saved = false) {
  const root = document.createElement("div");
  root.className = "musicItem";
  root.tabIndex = 0;

  const img = document.createElement("img");
  img.src = track.cover || "https://via.placeholder.com/72?text=🎵";
  img.alt = `${track.title} cover`;

  const info = document.createElement("div");
  info.className = "info";
  const title = document.createElement("p");
  title.textContent = track.title || "Untitled";
  const artist = document.createElement("p");
  artist.textContent = track.artist || "Unknown";

  if (track.preview) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = track.preview;
    audio.setAttribute("preload", "none");
    info.appendChild(audio);
  }

  const btns = document.createElement("div");
  btns.className = "musicButtons";

  const openLink = document.createElement("a");
  openLink.href = track.url || "#";
  openLink.target = "_blank";
  openLink.rel = "noopener noreferrer";
  openLink.className = "spotifyBtn";
  openLink.textContent = "Open in Spotify";

  if (saved && id) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "removeBtn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      if (!confirm("Remove this track from saved?")) return;
      try {
        const { doc } = await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js");
        const docRef = doc(db, "music", id);
        await deleteDoc(docRef);
        addToTimeline(`Music removed: ${track.title} ❌`);
        root.remove();
      } catch (err) {
        console.error("Failed to remove music", err);
        alert("Couldn't remove the track.");
      }
    });
    btns.append(openLink, removeBtn);
  } else {
    const addBtn = document.createElement("button");
    addBtn.className = "addBtn";
    addBtn.textContent = "Add";
    addBtn.addEventListener("click", async () => {
      try {
        await addDoc(collectionsMap.music, {
          title: track.title,
          artist: track.artist,
          cover: track.cover || null,
          preview: track.preview || null,
          url: track.url || null,
          timestamp: serverTimestamp()
        });
        addToTimeline(`Music added: ${track.title} 🎵`);
      } catch (err) {
        console.error("Failed to save music", err);
        alert("Couldn't save the track.");
      }
    });
    btns.append(addBtn, openLink);
  }

  info.appendChild(title);
  info.appendChild(artist);
  info.appendChild(btns);
  root.appendChild(img);
  root.appendChild(info);
  return root;
}

addMusicBtn.addEventListener("click", searchMusic);
clearSearchBtn.addEventListener("click", () => {
  musicInput.value = "";
  searchResults.innerHTML = "<div class='muted'>Search cleared.</div>";
});

async function searchMusic() {
  const q = (musicInput.value || "").trim();
  if (!q) { alert("Type an artist or song!"); return; }

  searchResults.innerHTML = "<div class='muted'>Searching…</div>";
  try {
    const res = await fetch(`https://love-site-spotify-backend.vercel.app/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    if (!data || !data.length) {
      searchResults.innerHTML = "<div class='muted'>No results found.</div>";
      return;
    }
    searchResults.innerHTML = "";
    data.forEach(track => {
      const trackData = {
        title: track.name,
        artist: track.artists?.map(a => a.name).join(", "),
        cover: track.album?.images?.[0]?.url,
        preview: track.preview_url,
        url: track.external_urls?.spotify
      };
      const node = createMusicItem(trackData, null, false);
      searchResults.appendChild(node);
    });
  } catch (err) {
    console.error(err);
    searchResults.innerHTML = "<div class='muted'>Error fetching music. Try again later.</div>";
  }
}

/* ================= STARTUP renderers ================= */
renderTimeline();
renderNotes();
renderSavedMusic();

/* ================= Utilities ================= */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
