// script.js - Full Implementation

/* ================= FIREBASE IMPORTS ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, deleteDoc, doc, limit, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getDatabase, ref, set, onDisconnect, onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ================= CONFIGURATION ================= */
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

/* ================= GLOBAL STATE ================= */
const USERS = {
  "brayden@love.com": "Brayden",
  "youna@love.com": "Youna"
};

const START_DATE = new Date("2024-05-09T00:00:00");

// Collection References
const COLS = {
  notes: collection(db, "notes"),
  events: collection(db, "events"),
  photos: collection(db, "photos"),
  videos: collection(db, "videos"),
  music: collection(db, "music"),
  timeline: collection(db, "timeline"),
  settings: collection(db, "settings")
};

let currentUser = null;
let mapInstance = null;
let currentCalDate = new Date();
let eventDatesSet = new Set(); // Stores dates that have events for the calendar dots

/* ================= UTILITIES ================= */

function showToast(msg) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  container.appendChild(el);
  // Remove after 3s
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getUserName() {
  if (!currentUser) return "User";
  return USERS[currentUser.email] || currentUser.email;
}

// Long Press Detector for Mobile Deletion
function addLongPressListener(element, callback) {
  let timer;
  
  const start = () => {
    timer = setTimeout(() => {
      callback();
    }, 800); // 800ms long press
  };
  
  const end = () => {
    clearTimeout(timer);
  };

  element.addEventListener("touchstart", start);
  element.addEventListener("touchend", end);
  element.addEventListener("touchmove", end);
  
  // Also support right-click on desktop
  element.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    callback();
  });
}

/* ================= ACTION SHEET (iOS Menu) ================= */

function showActionSheet(title, actions) {
  // Remove existing
  const existing = document.querySelector(".action-menu-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "action-menu-overlay";
  
  const menu = document.createElement("div");
  menu.className = "action-menu";
  
  // Action Group
  const group = document.createElement("div");
  group.className = "menu-group";
  
  if (title) {
    const titleDiv = document.createElement("div");
    titleDiv.style.padding = "12px";
    titleDiv.style.fontSize = "13px";
    titleDiv.style.color = "var(--color-text-secondary)";
    titleDiv.style.textAlign = "center";
    titleDiv.textContent = title;
    group.appendChild(titleDiv);
  }

  actions.forEach(a => {
    const btn = document.createElement("button");
    btn.className = `menu-btn ${a.destructive ? "destructive" : ""}`;
    btn.textContent = a.label;
    btn.onclick = () => {
      a.onClick();
      overlay.remove();
    };
    group.appendChild(btn);
  });
  
  // Cancel Button
  const cancelGroup = document.createElement("div");
  cancelGroup.className = "menu-group";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "menu-btn cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = () => overlay.remove();
  cancelGroup.appendChild(cancelBtn);

  menu.appendChild(group);
  menu.appendChild(cancelGroup);
  overlay.appendChild(menu);
  document.body.appendChild(overlay);
  
  // Close if clicking outside
  overlay.addEventListener('click', (e) => {
    if(e.target === overlay) overlay.remove();
  });
}

/* ================= AUTH & PRESENCE ================= */

function initPresence() {
  const myName = getUserName();
  const myRef = ref(rtdb, `presence/${myName}`);

  // Set self to online
  set(myRef, { online: true, lastChanged: Date.now() });
  // Set self to offline on disconnect
  onDisconnect(myRef).set({ online: false, lastChanged: Date.now() });

  // Watch others
  ["Brayden", "Youna"].forEach(name => {
    const userRef = ref(rtdb, `presence/${name}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      const isOnline = data && data.online;
      const statusEl = document.getElementById(`${name.toLowerCase()}Status`);
      
      if (statusEl) {
        statusEl.textContent = isOnline ? "Online" : "Offline";
        if (isOnline) statusEl.classList.add("online");
        else statusEl.classList.remove("online");
      }
    });
  });
}

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const authScreen = document.getElementById("authScreen");
  const appContent = document.getElementById("appContent");

  if (user) {
    // Logged In
    authScreen.classList.add("hidden");
    appContent.classList.remove("hidden");
    initPresence();
    loadSavings();
  } else {
    // Logged Out
    authScreen.classList.remove("hidden");
    appContent.classList.add("hidden");
  }
});

// Login Button
document.getElementById("loginBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast("Welcome back!");
  } catch (error) {
    showToast("Login Failed: " + error.message);
  }
});

// Logout Button
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  signOut(auth);
});

/* ================= DASHBOARD ================= */

function updateCounter() {
  const el = document.getElementById("daysCounter");
  if (!el) return;
  const now = new Date();
  const diff = now - START_DATE;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  
  el.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
setInterval(updateCounter, 1000);

/* ================= SAVINGS (PERSISTENT) ================= */

let currentSavings = 0;
const SAVINGS_GOAL = 10000;

async function loadSavings() {
  // Listen to the savings document in real-time
  onSnapshot(doc(db, "settings", "savings"), (docSnap) => {
    if (docSnap.exists()) {
      currentSavings = docSnap.data().amount || 0;
      renderSavingsUI();
    }
  });
}

function renderSavingsUI() {
  const amountEl = document.getElementById("savingsAmount");
  const fillEl = document.getElementById("savingsProgressFill");
  const pctEl = document.getElementById("savingsPercent");
  
  if (amountEl) amountEl.textContent = `$${currentSavings.toLocaleString()}`;
  
  const pct = Math.min(100, (currentSavings / SAVINGS_GOAL) * 100);
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct.toFixed(1)}%`;
}

// Add to savings
document.getElementById("savingsProgressBar")?.addEventListener("click", async () => {
  const input = prompt("Enter amount to add to savings:");
  if (input && !isNaN(input)) {
    const addedAmount = parseFloat(input);
    const newTotal = currentSavings + addedAmount;
    
    // Save to Firestore
    await setDoc(doc(db, "settings", "savings"), { amount: newTotal }, { merge: true });
    
    addToTimeline(`Saved $${addedAmount}`);
    showToast(`Added $${addedAmount} to savings`);
  }
});

/* ================= TIMELINE ================= */

async function addToTimeline(text) {
  if (!currentUser) return;
  await addDoc(COLS.timeline, {
    text: text,
    user: getUserName(),
    timestamp: serverTimestamp()
  });
}

// Render Timeline
const timelineList = document.getElementById("timelineList");
if (timelineList) {
  onSnapshot(query(COLS.timeline, orderBy("timestamp", "desc"), limit(20)), (snap) => {
    timelineList.innerHTML = "";
    if (snap.empty) {
      timelineList.innerHTML = '<div class="list-item">No history yet</div>';
      return;
    }
    
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "list-item";
      // Simple Date Format
      let timeStr = "";
      if (data.timestamp) {
        timeStr = new Date(data.timestamp.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      }
      
      div.innerHTML = `
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:16px;">${escapeHtml(data.text)}</span>
          <span style="font-size:12px; color:var(--color-text-secondary); margin-top:2px;">
            ${data.user} • ${timeStr}
          </span>
        </div>
      `;
      timelineList.appendChild(div);
    });
  });
}

/* ================= CALENDAR & EVENTS ================= */

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const monthLabel = document.getElementById("monthYear");
  if (!grid) return;
  
  grid.innerHTML = "";
  
  const y = currentCalDate.getFullYear();
  const m = currentCalDate.getMonth();
  
  monthLabel.textContent = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const firstDayIndex = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  
  // Empty slots for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    grid.appendChild(document.createElement("div"));
  }
  
  const today = new Date();
  
  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement("div");
    el.className = "cal-day";
    el.textContent = d;
    
    // Check today
    if (d === today.getDate() && m === today.getMonth() && y === today.getFullYear()) {
      el.classList.add("today");
    }
    
    // Check for events (Dot indicator)
    // Format date string to match DB (YYYY-MM-DD)
    const dateString = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (eventDatesSet.has(dateString)) {
      el.classList.add("has-event");
    }
    
    el.onclick = () => {
      document.querySelectorAll(".cal-day").forEach(x => x.classList.remove("selected"));
      el.classList.add("selected");
      // Pre-fill the date input if adding event
      document.getElementById("eventDate").value = dateString;
    };
    
    grid.appendChild(el);
  }
}

// Calendar Navigation
document.getElementById("prevMonth")?.addEventListener("click", () => {
  currentCalDate.setMonth(currentCalDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonth")?.addEventListener("click", () => {
  currentCalDate.setMonth(currentCalDate.getMonth() + 1);
  renderCalendar();
});

// Event Listeners
onSnapshot(query(COLS.events, orderBy("date", "asc")), (snap) => {
  const fullList = document.getElementById("eventsListFull");
  const dashList = document.getElementById("dashboardEventsList");
  
  if(fullList) fullList.innerHTML = "";
  if(dashList) dashList.innerHTML = "";
  
  eventDatesSet.clear();
  
  if (snap.empty) {
    if(dashList) dashList.innerHTML = '<div class="list-item empty-state">No upcoming events</div>';
    return;
  }

  let count = 0;
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    
    // Add to date set for calendar dots
    if (data.date) eventDatesSet.add(data.date);
    
    // Create UI Item
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div style="width:100%">
        <div style="font-weight:600; font-size:16px;">${escapeHtml(data.title)}</div>
        <div style="font-size:13px; color:var(--color-text-secondary); margin-top:4px;">
          📅 ${data.date}
        </div>
      </div>
    `;
    
    // Delete Logic
    addLongPressListener(item, () => {
      showActionSheet(`Delete "${data.title}"?`, [
        {
          label: "Delete Event",
          destructive: true,
          onClick: async () => {
            await deleteDoc(doc(COLS.events, id));
            showToast("Event deleted");
          }
        }
      ]);
    });
    
    if(fullList) fullList.appendChild(item);
    
    // Add first 3 to dashboard
    if (count < 3 && dashList) {
      const clone = item.cloneNode(true);
      // Re-attach listener to clone isn't automatic, need to re-bind or just display
      // For simplicity, we won't re-bind delete on dashboard mini-view
      dashList.appendChild(clone);
      count++;
    }
  });
  
  // Re-render calendar to show new dots
  renderCalendar();
});

// Add Event Logic
const eventForm = document.getElementById("eventForm");
document.getElementById("addEventBtn")?.addEventListener("click", () => {
  eventForm.classList.remove("hidden");
});
document.getElementById("cancelEvent")?.addEventListener("click", () => {
  eventForm.classList.add("hidden");
});
document.getElementById("saveEvent")?.addEventListener("click", async () => {
  const title = document.getElementById("eventTitle").value;
  const date = document.getElementById("eventDate").value;
  
  if (title && date) {
    await addDoc(COLS.events, {
      title, date, user: getUserName(), timestamp: serverTimestamp()
    });
    eventForm.classList.add("hidden");
    document.getElementById("eventTitle").value = "";
    addToTimeline(`New Event: ${title}`);
    showToast("Event Saved");
  }
});

/* ================= MEDIA (Notes, Photos, Videos, Music) ================= */

function setupMediaHandler(type, renderCallback) {
  const containerId = type === 'notes' ? "notesList" :
                      type === 'photos' ? "photosGrid" :
                      type === 'videos' ? "videosGrid" : "musicList";
  
  const container = document.getElementById(containerId);
  if (!container) return;

  onSnapshot(query(COLS[type], orderBy("timestamp", "desc"), limit(50)), (snap) => {
    container.innerHTML = "";
    
    // Special case: Latest note on dashboard
    if (type === 'notes' && !snap.empty) {
      const latest = snap.docs[0].data().content;
      const dashNote = document.getElementById("latestNoteText");
      if (dashNote) dashNote.textContent = latest;
    }

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      
      const el = renderCallback(data);
      
      // Delete Interaction
      addLongPressListener(el, () => {
        showActionSheet("Delete item?", [
          {
            label: "Delete",
            destructive: true,
            onClick: async () => {
              await deleteDoc(doc(COLS[type], id));
              showToast("Item deleted");
            }
          }
        ]);
      });
      
      container.appendChild(el);
    });
  });
}

// 1. NOTES (Enhanced Chat Style)
setupMediaHandler('notes', (data) => {
  const div = document.createElement("div");
  
  // 1. Determine if note is Mine or Theirs
  const isMe = data.user === getUserName();
  div.className = `note-bubble ${isMe ? "note-mine" : "note-other"}`;

  // 2. Format Timestamp (Handle Firestore latency)
  let timeStr = "Just now";
  if (data.timestamp) {
    // Firestore timestamps come as objects with .toDate()
    const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date();
    timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // 3. Render Content
  div.innerHTML = `
    <div>${escapeHtml(data.content)}</div>
    <div class="note-meta">${timeStr}</div>
  `;
  
  // 4. Auto-Scroll to bottom when new note arrives
  setTimeout(() => {
    const container = document.getElementById("notesList");
    if(container) container.scrollTop = container.scrollHeight;
  }, 100);

  return div;
});

document.getElementById("sendNoteBtn")?.addEventListener("click", async () => {
  const input = document.getElementById("noteInput");
  const val = input.value.trim();
  
  if (val) {
    // Clear immediately for better UX
    input.value = "";
    input.focus();

    try {
      await addDoc(COLS.notes, {
        content: val,
        user: getUserName(),
        timestamp: serverTimestamp()
      });
      addToTimeline("Posted a note");
    } catch (e) {
      console.error("Error sending note", e);
      input.value = val; // Restore text if error
      showToast("Error sending note");
    }
  }
});

/* ================= CLOUDINARY CONFIG ================= */
// REPLACE THESE WITH YOUR ACTUAL CLOUDINARY DETAILS
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "sharedlife"; // Must be "Unsigned"

async function uploadToCloudinary(file, resourceType = 'auto') {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${dgip2lmxu}/${resourceType}/upload`;

  try {
    showToast("Uploading media...");
    const res = await fetch(url, { method: "POST", body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
  } catch (e) {
    console.error("Upload failed:", e);
    showToast("Upload failed: " + e.message);
    return null;
  }
}

/* ================= 2. PHOTOS (Device Upload) ================= */
setupMediaHandler('photos', (data) => {
  const div = document.createElement("div");
  div.className = "grid-item";
  
  const img = document.createElement("img");
  img.src = data.url;
  img.loading = "lazy";
  
  // Click to view full size (Optional simple lightbox)
  div.onclick = () => window.open(data.url, '_blank');
  
  div.appendChild(img);
  return div;
});

// UI Trigger
document.getElementById("triggerPhotoUpload")?.addEventListener("click", () => {
  document.getElementById("photoFileInput").click();
});

// File Input Change Listener
document.getElementById("photoFileInput")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = await uploadToCloudinary(file, 'image');
  if (url) {
    await addDoc(COLS.photos, {
      url: url,
      user: getUserName(),
      timestamp: serverTimestamp()
    });
    addToTimeline("Uploaded a new photo");
    showToast("Photo saved!");
  }
  // Reset input so you can upload the same file again if needed
  e.target.value = "";
});


/* ================= 3. VIDEOS (Device Upload) ================= */
setupMediaHandler('videos', (data) => {
  const div = document.createElement("div");
  div.className = "video-card";
  
  div.innerHTML = `
    <video src="${data.url}" controls playsinline></video>
    <div class="video-meta">Uploaded by ${data.user}</div>
  `;
  return div;
});

// UI Trigger
document.getElementById("triggerVideoUpload")?.addEventListener("click", () => {
  document.getElementById("videoFileInput").click();
});

// File Input Change Listener
document.getElementById("videoFileInput")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Video uploads can take longer, ensure user knows
  showToast("Uploading video (this may take a moment)...");
  
  const url = await uploadToCloudinary(file, 'video');
  if (url) {
    await addDoc(COLS.videos, {
      url: url,
      user: getUserName(),
      timestamp: serverTimestamp()
    });
    addToTimeline("Uploaded a new video");
    showToast("Video saved!");
  }
  e.target.value = "";
});
// 4. MUSIC (iTunes API Integration)

// A. Render Saved Music (From Firebase)
setupMediaHandler('music', (data) => {
  const div = document.createElement("div");
  div.className = "media-item"; // Updated CSS class
  
  // Check if we have rich data (new format) or old data (just url)
  const title = data.title || "Unknown Song";
  const artist = data.artist || "Unknown Artist";
  const artwork = data.artwork || "https://via.placeholder.com/60"; // Fallback image
  const link = data.url;
  const preview = data.preview; // Audio preview URL

  div.innerHTML = `
    <img src="${artwork}" class="album-art" alt="art" />
    <div class="media-info">
      <div class="media-title">${escapeHtml(title)}</div>
      <div class="media-artist">${escapeHtml(artist)}</div>
      <div style="font-size:10px; color:var(--color-text-secondary);">Added by ${data.user}</div>
    </div>
    
    <div style="display:flex; gap:8px;">
      ${preview ? `
        <button class="preview-btn" onclick="this.nextElementSibling.play()">▶</button>
        <audio src="${preview}" class="hidden"></audio>
      ` : ''}
      <a href="${link}" target="_blank" class="preview-btn">🔗</a>
    </div>
  `;
  return div;
});

// B. Search and Add Music Logic
document.getElementById("addMusicBtn")?.addEventListener("click", async () => {
  const input = document.getElementById("musicInput");
  const resultsContainer = document.getElementById("musicSearchResults");
  const term = input.value.trim();

  if (!term) return;

  // 1. Clear previous results and show loading
  resultsContainer.innerHTML = '<div class="list-item" style="justify-content:center; color:gray;">Searching iTunes...</div>';
  resultsContainer.classList.remove("hidden");

  try {
    // 2. Fetch from iTunes API
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`);
    const data = await response.json();

    resultsContainer.innerHTML = ""; // Clear loading

    if (data.resultCount === 0) {
      resultsContainer.innerHTML = '<div class="list-item">No results found.</div>';
      return;
    }

    // 3. Render Search Results
    data.results.forEach(song => {
      const resultEl = document.createElement("div");
      resultEl.className = "media-item";
      resultEl.style.cursor = "pointer";
      // Highlight on hover/touch
      resultEl.onmouseover = () => resultEl.style.background = "var(--color-bg)";
      resultEl.onmouseout = () => resultEl.style.background = "transparent";

      resultEl.innerHTML = `
        <img src="${song.artworkUrl100}" class="album-art" />
        <div class="media-info">
          <div class="media-title">${song.trackName}</div>
          <div class="media-artist">${song.artistName}</div>
        </div>
        <button class="btn-text" style="font-size:20px; color:var(--color-green);">+</button>
      `;

      // 4. Click to Add to Firebase
      resultEl.addEventListener("click", async () => {
        // Save rich metadata to Firestore
        await addDoc(COLS.music, {
          url: song.trackViewUrl, // Link to Apple Music
          title: song.trackName,
          artist: song.artistName,
          artwork: song.artworkUrl100,
          preview: song.previewUrl, // 30s clip
          user: getUserName(),
          timestamp: serverTimestamp()
        });

        addToTimeline(`Added song: ${song.trackName}`);
        
        // Cleanup UI
        input.value = "";
        resultsContainer.innerHTML = "";
        resultsContainer.classList.add("hidden");
        showToast(`Added "${song.trackName}"`);
      });

      resultsContainer.appendChild(resultEl);
    });

  } catch (error) {
    console.error(error);
    resultsContainer.innerHTML = '<div class="list-item destructive">Error searching iTunes</div>';
  }
});
/* ================= MAP ================= */

function initMap() {
  if (mapInstance) return; // Already inited
  
  const mapContainer = document.getElementById("map");
  if (!mapContainer) return;

  // Initialize Leaflet
  mapInstance = L.map('map').setView([34.0522, -118.2437], 11); // Default LA

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(mapInstance);
  
  loadMapMarkers();
}

function loadMapMarkers() {
  // 1. Home Marker
  L.marker([34.0522, -118.2437]).addTo(mapInstance)
   .bindPopup("<b>Home</b><br>Where the heart is.");
   
  // 2. Fetch Photos/Videos that "simulate" location
  // In a real app, you'd store lat/lng in the photo doc.
  // Here we simulate markers based on database entries to populate the map.
  onSnapshot(COLS.photos, (snap) => {
    snap.forEach(doc => {
      const data = doc.data();
      // Randomize location slightly around LA for demo purposes
      const lat = 34.05 + (Math.random() - 0.5) * 0.2;
      const lng = -118.24 + (Math.random() - 0.5) * 0.2;
      
      L.marker([lat, lng]).addTo(mapInstance)
       .bindPopup(`<img src="${data.url}" style="width:100px; border-radius:8px;"><br>Posted by ${data.user}`);
    });
  });
}

/* ================= TAB NAVIGATION & INIT ================= */

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    // 1. Active State
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // 2. Show Section
    document.querySelectorAll(".tab-section").forEach(s => s.classList.add("hidden"));
    const tabId = btn.dataset.tab;
    document.getElementById(`tab-${tabId}`).classList.remove("hidden");
    
    // 3. Update Header
    const titles = { dashboard: "Home", schedule: "Plan", media: "Media", map: "Map" };
    const headerTitle = document.querySelector(".header-title");
    if (headerTitle) headerTitle.textContent = titles[tabId];
    
    // 4. Map Resize Fix (Critical!)
    if (tabId === "map") {
      // Delay slightly to allow DOM to un-hide, then resize map
      setTimeout(() => {
        initMap();
        if (mapInstance) mapInstance.invalidateSize();
      }, 100);
    }
  });
});

// Initial load
window.addEventListener("load", () => {
  renderCalendar();
});
