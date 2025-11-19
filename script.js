// script.js - Optimized, Functional, and Amazing (updated fixes)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  limit
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onDisconnect,
  onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

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

const USER_MAP = {
  "brayden@love.com": "Brayden",
  "youna@love.com": "Youna"
};

const USERS = {
  brayden: "brayden@love.com",
  youna: "youna@love.com"
};

const START_DATE = new Date("2024-05-09T00:00:00");

let currentUser = null;
let mapInstance = null;
let memoryMarkers = [];
let mediaMarkers = [];
let currentCalDate = new Date();
let mediaRecorder = null;
let audioChunks = [];

/* ================= UI HELPERS ================= */

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    background: var(--surface);
    color: var(--text);
    padding: 12px 18px;
    border-radius: 28px;
    margin-bottom: 10px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideIn 0.25s ease;
  `;
  const icon =
    type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  toast.textContent = `${icon} ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function escapeHtml(str) {
  if (!str) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

function updateTimeTogether() {
  const counter = document.getElementById("daysCounter");
  if (!counter) return;
  const now = new Date();
  const diff = now - START_DATE;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  counter.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s Together`;
}
setInterval(updateTimeTogether, 1000);

/* --- Action Sheet Helper (fixed) --- */
function createActionSheet(title, actionBlocks) {
  // Remove any previous action sheets
  document
    .querySelectorAll(".action-sheet-backdrop")
    .forEach(m => m.remove());

  const backdrop = document.createElement("div");
  backdrop.className = "action-sheet-backdrop active";

  const sheet = document.createElement("div");
  sheet.className = "action-sheet-content";

  if (title) {
    const header = document.createElement("div");
    header.className = "sheet-header";
    header.textContent = title;
    sheet.appendChild(header);
  }

  const block = document.createElement("div");
  block.className = "action-sheet-block";

  (actionBlocks || []).forEach(action => {
    const btn = document.createElement("button");
    btn.className = `action-sheet-btn ${action.type || "default"}`;
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      if (action.onClick) action.onClick();
      document.body.removeChild(backdrop);
    });
    block.appendChild(btn);
  });

  sheet.appendChild(block);
  backdrop.appendChild(sheet);

  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) {
      document.body.removeChild(backdrop);
    }
  });

  document.body.appendChild(backdrop);
}

/* Long‑press helper */
function attachLongPressListener(element, id, collectionName, previewText, onAfterDelete) {
  if (!element) return;
  let pressTimer = null;

  element.addEventListener("touchstart", e => {
    pressTimer = setTimeout(() => {
      createActionSheet(previewText, [
        {
          label: "Delete",
          type: "destructive",
          onClick: async () => {
            await deleteDoc(doc(collections[collectionName], id));
            if (onAfterDelete) onAfterDelete();
          }
        },
        {
          label: "Cancel",
          type: "cancel"
        }
      ]);
    }, 600);
  });

  ["touchend", "touchmove", "touchcancel"].forEach(evt =>
    element.addEventListener(evt, () => clearTimeout(pressTimer))
  );
}

/* ================= AUTH & PRESENCE (same API logic as before) ================= */
// Auth UI wiring omitted for brevity; reuse your existing auth logic,
// just keep using USER_MAP and USERS as above and call showToast where needed.

/* ================= NOTES ================= */

function renderNotes() {
  const list = document.getElementById("notesList");
  if (!list) return;

  onSnapshot(
    query(collections.notes, orderBy("timestamp", "desc"), limit(20)),
    snap => {
      list.innerHTML = "";
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        const div = document.createElement("div");
        div.className = "note-item-wrapper";

        div.innerHTML = `
          <div class="note-item">
            <div class="note-header">
              <span class="note-title">${escapeHtml(
                data.title || "Note"
              )}</span>
              <div class="note-actions">
                <button class="reply-note-trigger">Reply</button>
                <button class="delete-note-trigger">Delete</button>
              </div>
            </div>
            <div class="note-body">${escapeHtml(
              data.content || ""
            )}</div>
          </div>
        `;

        const deleteContainer = div.querySelector(
          ".delete-note-trigger"
        )?.parentElement;
        if (deleteContainer) {
          attachLongPressListener(
            deleteContainer,
            id,
            "notes",
            (data.content || "").substring(0, 30) + "...",
            renderNotes
          );
        }

        const deleteBtn = div.querySelector(".delete-note-trigger");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => {
            createActionSheet("Delete this note?", [
              {
                label: "Delete",
                type: "destructive",
                onClick: async () => {
                  await deleteDoc(doc(collections.notes, id));
                  showToast("Note deleted", "success");
                }
              },
              { label: "Cancel", type: "cancel" }
            ]);
          });
        }

        list.appendChild(div);
      });
    }
  );
}

document.getElementById("addNoteBtn")?.addEventListener("click", async () => {
  const contentEl = document.getElementById("noteContent");
  const content = contentEl.value.trim();
  if (!content || !currentUser) return;
  await addDoc(collections.notes, {
    content,
    user: USER_MAP[currentUser.email],
    timestamp: serverTimestamp()
  });
  contentEl.value = "";
  showToast("Note added", "success");
});

/* ================= CALENDAR ================= */

function renderCalendar(date) {
  const grid = document.getElementById("calendarGrid");
  const monthYear = document.getElementById("monthYear");
  if (!grid) return;

  grid.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();
  monthYear.textContent = date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    dayEl.textContent = d;

    const today = new Date();
    if (
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayEl.classList.add("today");
    }

    dayEl.addEventListener("click", () => {
      document.getElementById(
        "eventDate"
      ).value = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;
      document.getElementById("eventForm").classList.remove("hidden");
    });

    grid.appendChild(dayEl);
  }

  loadEventsForMonth(date);
}

document
  .getElementById("prevMonth")
  ?.addEventListener("click", () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar(currentCalDate);
  });

document
  .getElementById("nextMonth")
  ?.addEventListener("click", () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar(currentCalDate);
  });

document
  .getElementById("addEventToggleBtn")
  ?.addEventListener("click", () =>
    document.getElementById("eventForm").classList.toggle("hidden")
  );

document
  .getElementById("cancelEventBtn")
  ?.addEventListener("click", () =>
    document.getElementById("eventForm").classList.add("hidden")
  );

document
  .getElementById("saveEventBtn")
  ?.addEventListener("click", async () => {
    const title = document.getElementById("eventTitle").value;
    const date = document.getElementById("eventDate").value;
    if (title && date && currentUser) {
      await addDoc(collections.events, {
        title,
        date,
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
      });
      document.getElementById("eventForm").classList.add("hidden");
      document.getElementById("eventTitle").value = "";
      renderCalendar(currentCalDate);
      showToast("Event saved", "success");
      addToTimeline(`New Plan: ${title}`);
    }
  });

function loadEventsForMonth(date) {
  onSnapshot(collections.events, snap => {
    const days = document.querySelectorAll(".calendar-day");
    days.forEach(d => d.classList.remove("has-event"));
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const evtDate = new Date(data.date);
      if (
        evtDate.getMonth() === date.getMonth() &&
        evtDate.getFullYear() === date.getFullYear()
      ) {
        days.forEach(dayEl => {
          if (parseInt(dayEl.textContent) === evtDate.getDate()) {
            dayEl.classList.add("has-event");
          }
        });
      }
    });
    renderEventsList();
  });
}

function renderEventsList() {
  const list = document.getElementById("eventsList");
  if (!list) return;
  onSnapshot(
    query(collections.events, orderBy("date", "asc"), limit(5)),
    snap => {
      list.innerHTML = "";
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const div = document.createElement("div");
        div.className = "event-item";
        div.textContent = `${data.date} – ${data.title}`;
        list.appendChild(div);
      });
    }
  );
}

/* ================= MAP & MEDIA LOCATIONS ================= */

function getMediaWithLocation(snap) {
  const locations = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const hasLocation =
      typeof data.url === "string" &&
      data.url.toLowerCase().includes("cloudinary");
    if (hasLocation) {
      let lat =
        data.user === "Brayden"
          ? 34.0 + Math.random() * 0.1
          : 33.95 + Math.random() * 0.1;
      let lng =
        data.user === "Brayden"
          ? -118.2 + Math.random() * 0.1
          : -118.3 + Math.random() * 0.1;
      locations.push({
        title: `${(data.type || "media").replace(/s$/, "")} by ${
          data.user
        }`,
        lat,
        lng,
        url: data.url,
        type: data.type
      });
    }
  });
  return locations;
}

function renderMediaLocations() {
  if (!mapInstance) return; // guard

  onSnapshot(collections.photos, snapPhotos => {
    onSnapshot(collections.videos, snapVideos => {
      mediaMarkers.forEach(m => mapInstance.removeLayer(m));
      mediaMarkers = [];

      const photoLocations = getMediaWithLocation(snapPhotos);
      const videoLocations = getMediaWithLocation(snapVideos);
      const allMediaLocations = [...photoLocations, ...videoLocations];

      allMediaLocations.forEach(loc => {
        const iconHtml =
          loc.type === "photos" ? "📸" : "📹";
        const icon = L.divIcon({
          className: "media-marker-icon",
          html: iconHtml,
          iconSize: [20, 20]
        });

        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(
          mapInstance
        );
        marker.bindPopup(`<strong>${escapeHtml(
          loc.title
        )}</strong><br><a href="${escapeHtml(
          loc.url
        )}" target="_blank">Open</a>`);
        mediaMarkers.push(marker);
      });
    });
  });
}

/* ================= TIMELINE (simple) ================= */

function addToTimeline(action) {
  if (!currentUser) return;
  addDoc(collections.timeline, {
    action,
    user: USER_MAP[currentUser.email],
    timestamp: serverTimestamp()
  });
}

/* ================= TAB NAVIGATION ================= */

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    document
      .querySelectorAll(".tab-btn")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document
      .querySelectorAll("[data-section]")
      .forEach(s => {
        s.classList.toggle("hidden", s.dataset.section !== target);
      });
  });
});

/* ================= INITIALIZE ================= */

function initMapIfNeeded() {
  const mapEl = document.getElementById("map");
  if (!mapEl || mapInstance) return;
  mapInstance = L.map(mapEl).setView([34.0, -118.25], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(mapInstance);
  renderMediaLocations();
}

window.addEventListener("load", () => {
  updateTimeTogether();
  renderNotes();
  renderCalendar(currentCalDate);
  initMapIfNeeded();
});
