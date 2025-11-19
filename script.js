// script.js - Optimized, Functional, and Amazing (MERGED + COMPLETE)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, getDocs, limit, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
// Re-adding necessary imports for the rest of the app functionality
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { Chart } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js";
import L from "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCg4ff72caOr1rk9y7kZAkUbcyjqfPuMLI",
  authDomain: "ourwebsite223.firebaseapp.com",
  databaseURL: "https://ourwebsite223-default-rtdb.firebaseio.com",
  projectId: "ourwebsite223",
  storageBucket: "ourwebsite223.firebasestorage.app",
  messagingSenderId: "978864749848",
  appId: "1:978864749848:web:dc2a053e7c6647c407f26d",
  measurementId: "G-0PQL5ZR1R5"
};
// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const rtdb = getDatabase(app);
const storage = getStorage(app); // Initialize Storage

// NEW COLLECTIONS ADDED
const collections = {
  photos: collection(db, "photos"),
  videos: collection(db, "videos"),
  music: collection(db, "music"),
  notes: collection(db, "notes"),
  events: collection(db, "events"),
  timeline: collection(db, "timeline"),
  favorites: collection(db, "favorites"),
  memories: collection(db, "memories"),
  todos: collection(db, "todos"), // NEW
  polls: collection(db, "polls"), // NEW
  checkins: collection(db, "checkins"), // NEW
};

// Corrected: USER_MAP should map email to display name
const USER_MAP = {
    'brayden@love.com': 'Brayden',
    'youna@love.com': 'Youna'
};
const USERS = { brayden: 'brayden@love.com', youna: 'youna@love.com' };
const START_DATE = new Date("2024-05-09T00:00:00");

// USER LOCATION MOCK (for weather)
const USER_LOCATIONS = {
  'Brayden': { city: 'New York', lat: 40.7128, lng: -74.0060 },
  'Youna': { city: 'Los Angeles', lat: 34.0522, lng: -118.2437 }
};

let currentUser = null;
let mapInstance = null;
let memoryMarkers = [];
let mediaMarkers = [];
let mediaVisible = false; // Controls map media layer visibility
let currentCalDate = new Date();
let mediaRecorder = null;
let audioChunks = [];
let moodChart = null; // For mood chart in checkins

// --- DOM Elements for Login (REQUIRED) ---
const authModal = document.getElementById('authModal');
const braydenLoginBtn = document.getElementById('braydenLogin');
const younaLoginBtn = document.getElementById('younaLogin');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const signInBtn = document.getElementById('signInBtn');

// --- User Mock Data (REQUIRED) ---
const USER_CREDENTIALS = {
  // NOTE: USERS.brayden is 'brayden@love.com'. USER_MAP['brayden@love.com'] is 'Brayden'.
  'brayden': { email: 'brayden@love.com', displayName: USER_MAP[USERS.brayden], password: 'loveee' },
  'youna': { email: 'youna@love.com', displayName: USER_MAP[USERS.youna], password: 'loveee' }
};
let selectedUser = null;
let currentUserProfile = null;

// script.js (updateUserDisplay function)
function updateUserDisplay(user) {
    // The user display logic for loginButton, profileButton, etc. is mostly removed
    // as it relates to a header structure not present in the current HTML.
    // The main focus here is showing/hiding the primary app container.
    const mainContainer = document.getElementById('mainAppContainer');

    if (user) {
        // User is signed in
        currentUser = user;
        
        // Check if the HTML structure for the header exists (it does)
        // If you had profile elements in the header, you'd update them here.

        // Show app content
        if(mainContainer) mainContainer.style.display = 'block';

    } else {
        // User is signed out (user is null)
        currentUser = null;
        
        // Hide app content
        if(mainContainer) mainContainer.style.display = 'none';
    }
}

/* ================= UI HELPERS ================= */

function showToast(message, type = 'info') {
    console.log(`[TOAST ${type.toUpperCase()}]:`, message);
    
    const container = document.getElementById('toastContainer');
    if(!container) {
        console.error('Toast container not found! Message was:', message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const bgColor = type === 'error' ? '#FF3B30' : type === 'success' ? '#34C759' : 'var(--surface)';
    const textColor = (type === 'error' || type === 'success') ? 'white' : 'var(--text)';
    
    toast.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        padding: 14px 20px;
        border-radius: 12px;
        margin-bottom: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 1px solid ${type === 'error' ? '#FF3B30' : 'var(--border)'};
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
        position: relative;
        z-index: 10000;
        font-weight: 500;
    `;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span style="font-size:18px">${icon}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(str) {
    return !str ? '' : String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' })[m]);
}

/* ================= LOGIN & AUTH (FIXED) ================= */

function selectProfile(user) {
    console.log(`Profile selected: ${user}`);
    selectedUser = user;
    
    // FIX (Login Issue): Pre-fill email AND password for quick sign-in using mock data
    if (authEmailInput) authEmailInput.value = USER_CREDENTIALS[user].email;
    if (authPasswordInput) authPasswordInput.value = USER_CREDENTIALS[user].password;
    
    braydenLoginBtn?.classList.remove('active', 'primary', 'ghost');
    younaLoginBtn?.classList.remove('active', 'primary', 'ghost');

    const selectedBtn = document.getElementById(`${user}Login`);
    const otherBtn = document.getElementById(`${user === 'brayden' ? 'youna' : 'brayden'}Login`);

    selectedBtn?.classList.add('active', 'primary');
    otherBtn?.classList.add('ghost');
    
    // The password input is now filled, so no need to clear it or enable it.
    // authPasswordInput?.disabled = false;
    authPasswordInput?.focus();
    
    checkFormValidity();
}

function checkFormValidity() {
    const passwordValid = authPasswordInput?.value?.length > 0;
    const emailValid = authEmailInput?.value?.length > 0;
    
    if (passwordValid && emailValid) {
        signInBtn?.classList.remove('ghost');
        signInBtn?.classList.add('primary');
        if(signInBtn) signInBtn.disabled = false;
    } else {
        signInBtn?.classList.remove('primary');
        signInBtn?.classList.add('ghost');
        if(signInBtn) signInBtn.disabled = true;
    }
}

async function handleSignIn() {
    if (signInBtn.disabled) return;
    
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    
    console.log(`Attempting login for: ${email}`);

    if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
    }

    try {
        if (signInBtn) signInBtn.textContent = 'Signing In...';
        if (signInBtn) signInBtn.disabled = true;

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        const userKey = Object.keys(USERS).find(key => USERS[key] === userCredential.user.email);
        
        if (userKey) {
            currentUserProfile = USER_CREDENTIALS[userKey];
        } else {
            currentUserProfile = { displayName: userCredential.user.email, email: userCredential.user.email };
        }
        
        currentUser = userCredential.user;
        showToast(`Welcome back, ${currentUserProfile.displayName}!`, 'success');

        hideLogin();
        if (signInBtn) signInBtn.textContent = 'Sign In';
        
    } catch (error) {
        console.error('Sign In Error:', error.message);
        
        let displayError;
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            displayError = 'Login failed. Invalid email or password. Please check your credentials.';
        } else if (error.code === 'auth/invalid-email') {
            displayError = 'Invalid email format.';
        } else if (error.code === 'auth/too-many-requests') {
            displayError = 'Too many failed attempts. Please try again later.';
        } else if (error.code === 'auth/network-request-failed') {
            displayError = 'Network error. Check your connection.';
        } else {
            displayError = `Login failed. An unexpected error occurred: ${error.code || error.message}.`;
        }

        showToast(displayError, 'error');
        alert(displayError);
        if (signInBtn) signInBtn.textContent = 'Sign In';
        if (signInBtn) signInBtn.disabled = false;
        checkFormValidity();
    }
}

function showLogin() {
    authModal?.classList.add('active');
    document.body.classList.add('modal-open');
}

function hideLogin() {
    authModal?.classList.remove('active');
    document.body.classList.remove('modal-open');
}

// Attach Login Event Listeners - ONLY ONCE
if (braydenLoginBtn) {
    braydenLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectProfile('brayden');
    });
}

if (younaLoginBtn) {
    younaLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectProfile('youna');
    });
}

authPasswordInput?.addEventListener('input', checkFormValidity);
authEmailInput?.addEventListener('input', checkFormValidity);
signInBtn?.addEventListener('click', handleSignIn);

authPasswordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !signInBtn.disabled) {
        handleSignIn();
    }
});

// Logout Functionality
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        if (currentUser) {
            await set(ref(rtdb, `presence/${USER_MAP[currentUser.email]}`), { status: 'offline', timestamp: Date.now() });
        }
        await signOut(auth);
        showToast('You have been signed out.', 'info');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed. Try again.', 'error');
    }
});

// Authentication State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userKey = user.email === USERS.brayden ? 'brayden' : 'youna';
        currentUserProfile = USER_CREDENTIALS[userKey];
        currentUser = user;
        selectProfile(userKey);
        hideLogin();
        setupPresence(user);
        updateUserDisplay(user);
        initApp();
    } else {
        selectedUser = null;
        currentUserProfile = null;
        currentUser = null;
        if(authEmailInput) authEmailInput.value = '';
        if(authPasswordInput) authPasswordInput.value = '';
        checkFormValidity();
        
        if (braydenLoginBtn && !braydenLoginBtn.classList.contains('active') && !younaLoginBtn.classList.contains('active')) {
             selectProfile('brayden');
        }
        updateUserDisplay(null);
        showLogin();
    }
});

function setupPresence(user) {
    // Reference to the user's presence status in the Realtime Database
    const userRef = ref(rtdb, `presence/${USER_MAP[user.email]}`);

    // Set status to 'online' and handle disconnect
    set(userRef, { status: 'online', timestamp: Date.now() });
    onDisconnect(userRef).set({ status: 'offline', timestamp: Date.now() });

    // Listen for presence changes for both users (Retained from your partial)
    const braydenDot = document.getElementById('braydenPresence');
    const younaDot = document.getElementById('younaPresence');
    const braydenText = document.getElementById('braydenPresenceText');
    const younaText = document.getElementById('younaPresenceText');
    
    onValue(ref(rtdb, 'presence/Brayden'), (snapshot) => {
        const data = snapshot.val();
        updatePresenceUI(braydenDot, braydenText, 'Brayden', data);
    });
    
    onValue(ref(rtdb, 'presence/Youna'), (snapshot) => {
        const data = snapshot.val();
        updatePresenceUI(younaDot, younaText, 'Youna', data);
    });
}

function updatePresenceUI(dot, text, user, data) {
    if (data && data.status === 'online') {
        dot?.classList.add('online');
        if (text) text.textContent = `Online`;
    } else if (data) {
        dot?.classList.remove('online');
        const lastSeen = new Date(data.timestamp).toLocaleTimeString();
        if (text) text.textContent = `Last seen ${lastSeen}`;
    } else {
        dot?.classList.remove('online');
        if (text) text.textContent = 'Offline';
    }
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

/* ================= NAVIGATION ================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
        
        btn.classList.add("active");
        const sectionId = btn.dataset.section;
        const section = document.getElementById(sectionId);
        if(section) section.classList.add("active");
        
        // Special Handling
        if (sectionId === "mapSection") {
            setTimeout(initMap, 100);
            const toggleMediaBtn = document.getElementById('toggleMedia');
            // If the media button is active, re-render the media locations layer
            if(toggleMediaBtn && toggleMediaBtn.classList.contains('active')) renderMediaLocations(true);
        }
        if (sectionId === "schedule") renderCalendar(currentCalDate);
        if (sectionId === "lists") { renderTodos(); renderPolls(); }
        if (sectionId === "dashboard") renderDashboard(); // Ensure dashboard updates
        if (sectionId === "checkins") renderCheckins(); // Ensure checkins updates
    });
});


/* ================= TIMELINE LOGIC ================= */

async function addToTimeline(action) {
    if (!currentUser) return;
    try {
        await addDoc(collections.timeline, {
            user: USER_MAP[currentUser.email],
            action: action,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    onSnapshot(query(collections.timeline, orderBy('timestamp', 'desc'), limit(30)), (snapshot) => {
        if(!container) return;
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate()?.toLocaleString() || 'Just now';
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <span class="timeline-date">${escapeHtml(timestamp)} by ${escapeHtml(data.user)}</span>
                    <p class="timeline-text">${escapeHtml(data.action)}</p>
                </div>
            `;
            container.appendChild(item);
        });
    });
}


/* ================= DASHBOARD (HOME) LOGIC ================= */

const getMockWeather = (user) => {
    const data = USER_LOCATIONS[user];
    const temp = Math.floor(Math.random() * 20) + 10;
    const condition = Math.random() > 0.7 ? 'Cloudy' : Math.random() > 0.4 ? 'Sunny' : 'Rain';
    const icon = condition === 'Sunny' ? '☀️' : condition === 'Cloudy' ? '☁️' : '🌧️';
    return { ...data, temp, condition, icon };
};

function renderWeather() {
    ['Brayden', 'Youna'].forEach(user => {
        const data = getMockWeather(user);
        const card = document.getElementById(`weatherCard${user}`);
        if(card) {
            card.innerHTML = `
                <div class="weather-icon">${data.icon}</div>
                <h4 style="margin: 0 0 5px;">${user}'s ${data.city}</h4>
                <div class="weather-temp">${data.temp}°C</div>
                <div class="weather-meta">${data.condition}</div>
            `;
        }
    });
}

async function renderStats() {
    const statsContent = document.getElementById('statsContent');
    if(!statsContent) return;

    // 1. Total Items
    const [photos, videos, notes, music] = await Promise.all([
        getDocs(collections.photos).then(s => s.size),
        getDocs(collections.videos).then(s => s.size),
        getDocs(collections.notes).then(s => s.size),
        getDocs(collections.music).then(s => s.size),
    ]);
    const totalItems = photos + videos + notes + music;

    // 2. Who added the most recent item (simplified)
    const lastActivitySnap = await getDocs(query(collections.timeline, orderBy('timestamp', 'desc'), limit(1)));
    const lastActivity = lastActivitySnap.empty ? 'None' : lastActivitySnap.docs[0].data().user;

    // 3. Simple upload counts (Mock/Simplified)
    let braydenCount = Math.floor(totalItems / 2) + Math.floor(Math.random() * 10);
    let younaCount = totalItems - braydenCount + Math.floor(Math.random() * 10); // Ensure difference

    statsContent.innerHTML = `
        <div class="stat-group">
            <span class="stat-value">${totalItems}</span>
            <span class="stat-label">Total Shared Items</span>
        </div>
        <div class="stat-group">
            <span class="stat-value">${lastActivity}</span>
            <span class="stat-label">Last Contributor</span>
        </div>
        <div class="stat-group">
            <span class="stat-value">${braydenCount} / ${younaCount}</span>
            <span class="stat-label">B / Y Contributions</span>
        </div>
    `;
}

function renderMilestones() {
    const container = document.getElementById('milestoneListContainer');
    if(!container) return;

    // Hardcoded Milestones (Mock Data)
    const milestones = [
        { title: "One Year Anniversary", date: "2025-05-09", reached: new Date() > new Date("2025-05-09") },
        { title: "100th Photo Uploaded", date: "2025-11-20", reached: false },
        { title: "First Map Memory Added", date: "2024-06-15", reached: new Date() > new Date("2024-06-15") },
        { title: "50th Note Shared", date: "2025-01-01", reached: new Date() > new Date("2025-01-01") },
    ];
    
    container.innerHTML = milestones.map(m => `
        <div class="event-item" style="opacity: ${m.reached ? 1 : 0.6};">
            <div><strong>${m.reached ? '✅' : '⏳'} ${m.title}</strong></div>
            <span style="font-size:0.9rem; color:var(--subtext);">${m.date}</span>
        </div>
    `).join('');
}

function renderRecent() {
    const container = document.getElementById('recentContent');
    if(!container) return;
    onSnapshot(query(collections.timeline, orderBy('timestamp', 'desc'), limit(5)), snap => {
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.timestamp?.toDate()?.toLocaleTimeString() || 'Just now';
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <span style="font-size: 0.9rem; flex-shrink: 0; min-width: 60px; color: var(--primary);">${escapeHtml(data.user)}:</span>
                <span style="flex-grow: 1;">${escapeHtml(data.action)}</span>
                <span style="font-size: 0.75rem; color: var(--subtext); flex-shrink: 0;">${date}</span>
            `;
            container.appendChild(item);
        });
    });
}

function renderDashboard() {
    renderWeather();
    renderStats();
    renderMilestones();
    renderRecent();
}


/* ================= PHOTO/VIDEO LOGIC ================= */

function renderGallery(collectionKey) {
    const container = document.getElementById(collectionKey === 'photos' ? 'photoGallery' : 'videoGallery');
    if (!container) return;
    
    onSnapshot(query(collections[collectionKey], orderBy('timestamp', 'desc')), (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const isImage = data.type === 'image' || collectionKey === 'photos';
            const mediaElement = isImage
                ? `<img src="${escapeHtml(data.url)}" alt="Shared Photo" loading="lazy">`
                : `<video src="${escapeHtml(data.url)}" controls loading="lazy" style="background: black;"></video>`;

            const date = data.timestamp?.toDate()?.toLocaleDateString() || 'Recently';
            const item = document.createElement('div');
            item.className = 'masonry-item';
            item.dataset.id = id;
            item.innerHTML = `
                <div class="media-container" style="cursor: pointer;">
                    ${mediaElement}
                </div>
                <div class="item-meta">
                    <span title="Uploaded by ${escapeHtml(data.user)} on ${date}">${escapeHtml(data.user)} • ${date}</span>
                    <button class="btn icon-btn ghost small media-options-btn" data-id="${id}" data-type="${data.type}" data-url="${data.url}" data-caption="${escapeHtml(data.caption || '')}" aria-label="Media Options">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                    </button>
                </div>
                <p style="margin: 8px 0 0; font-size: 0.95rem;">${escapeHtml(data.caption || '')}</p>
                <div class="media-tag-list">
                    ${(data.tags || []).map(tag => `<span class="media-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            `;
            
            // Handler for opening media
            item.querySelector('.media-container')?.addEventListener('click', () => {
                if (!isImage) {
                    // For videos, clicking the container should not open the lightbox if controls are visible.
                    // But in this setup, the video is inside the container, so let's rely on the media element listener below
                    return;
                }
                openLightbox(data.url, isImage ? 'image' : 'video', data.caption);
            });
            
            // Handler for media options modal
            item.querySelector('.media-options-btn')?.addEventListener('click', (e) => {
                const button = e.currentTarget;
                openMediaModal(button.dataset.id, button.dataset.type, button.dataset.url, button.dataset.caption);
            });

            container.appendChild(item);
        });
    });
}

/* ================= MEDIA MODAL & LIGHTBOX LOGIC ================= */

function openLightbox(url, type, caption = '') {
    const lightbox = document.getElementById('lightbox');
    const mediaContainer = document.querySelector('#lightbox .lightbox-media-container');
    const captionElement = document.querySelector('#lightbox .lightbox-meta .lightbox-caption');
    
    if(!lightbox || !mediaContainer) return;
    
    mediaContainer.innerHTML = '';
    let mediaElement;
    
    if (type === 'image' || type === 'photo') {
        mediaElement = document.createElement('img');
        mediaElement.src = url;
        mediaElement.alt = 'Shared photo';
    } else if (type === 'video') {
        mediaElement = document.createElement('video');
        mediaElement.src = url;
        mediaElement.controls = true;
        mediaElement.autoplay = true;
        mediaElement.loop = true;
        mediaElement.style.maxWidth = '100%';
        mediaElement.style.maxHeight = '100%';
        mediaElement.style.borderRadius = '14px';
    } else {
        return;
    }
    
    mediaContainer.appendChild(mediaElement);
    captionElement.textContent = caption;
    lightbox.classList.add('active');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const mediaElement = document.querySelector('#lightbox .lightbox-media-container > :first-child');
    if(mediaElement && mediaElement.tagName.toLowerCase() === 'video') {
        mediaElement.pause(); // Stop video playback
    }
    lightbox?.classList.remove('active');
}

async function openMediaModal(id, type, url, caption) {
    if (!currentUser) return showToast("You must be logged in to view options.", 'error');

    const modal = document.getElementById('mediaModal');
    const title = document.getElementById('mediaModalTitle');
    const content = document.getElementById('mediaModalContent');
    if (!modal || !title || !content) return;

    try {
        title.textContent = `Options for ${type}`;
        content.innerHTML = `<p class="subtext-center">Loading options...</p>`;
        modal.classList.add('active');

        const collectionKey = (type === 'photo' || type === 'image') ? 'photos' : type;
        const mediaRef = doc(db, collectionKey, id);
        const mediaSnap = await getDoc(mediaRef);

        if (!mediaSnap.exists()) {
            content.innerHTML = `<p class="subtext-center">Media not found.</p>`;
            return;
        }

        const data = mediaSnap.data();

        // Reactions
        const reactionEmojis = ['❤️', '😂', '😮', '👍', '🔥'];
        const reactions = data.reactions || {};
        const reactionsHtml = `
            <h4 style="margin-bottom: 8px;">Reactions</h4>
            <div class="reaction-pills">
                ${reactionEmojis.map(emoji => {
                    const count = (reactions[emoji] || []).length;
                    const userVoted = (reactions[emoji] || []).includes(USER_MAP[currentUser.email]);
                    return `<span class="reaction-pill ${userVoted ? 'user-reacted' : ''}" data-emoji="${emoji}" data-id="${id}" data-type="${collectionKey}">${emoji} ${count > 0 ? count : ''}</span>`;
                }).join('')}
            </div>
            <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;">
        `;

        // Comments
        const comments = data.comments || [];
        const commentsHtml = `
            <h4 style="margin-bottom: 8px;">Comments (${comments.length})</h4>
            <div class="media-comments">
                ${comments.map(c => `
                    <div class="comment-item">
                        <strong>${escapeHtml(c.user)}:</strong> ${escapeHtml(c.content)}
                        <span class="subtext" style="font-size:0.75rem; margin-left: 8px;">${new Date(c.timestamp).toLocaleTimeString()}</span>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <input type="text" id="mediaCommentInput" placeholder="Add a comment..." style="flex-grow: 1;">
                <button id="addCommentBtn" class="btn primary small" data-id="${id}" data-type="${collectionKey}">Send</button>
            </div>
            <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;">
        `;

        // Action Buttons
        const isFavorite = (await getDoc(doc(db, 'favorites', id))).exists();

        const actionButtonsHtml = `
            <div class="modal-footer" style="justify-content: space-between; margin-top: 0;">
                <button id="deleteMediaBtn" class="btn ghost small" data-id="${id}" data-type="${collectionKey}" style="color: var(--error);">Delete</button>
                <button id="toggleFavoriteBtn" class="btn secondary small" data-id="${id}" data-is-fav="${isFavorite}">
                    ${isFavorite ? '⭐ Unfavorite' : '⭐ Add to Favorites'}
                </button>
            </div>
        `;

        content.innerHTML = reactionsHtml + commentsHtml + actionButtonsHtml;
        attachMediaModalListeners(id, collectionKey);

    } catch (e) {
        console.error("Error opening media modal:", e);
        title.textContent = 'An error occurred';
    }
}

function attachMediaModalListeners(mediaId, collectionKey) {
    const user = USER_MAP[currentUser.email];
    if (!user) return;

    // Reaction Handler
    document.querySelectorAll('.reaction-pill').forEach(pill => {
        pill.onclick = async (e) => {
            const emoji = e.currentTarget.dataset.emoji;
            const mediaRef = doc(db, collectionKey, mediaId);
            const data = (await getDoc(mediaRef)).data();
            const voters = data?.reactions?.[emoji] || [];
            
            if (voters.includes(user)) {
                await updateDoc(mediaRef, { [`reactions.${emoji}`]: arrayRemove(user) });
            } else {
                await updateDoc(mediaRef, { [`reactions.${emoji}`]: arrayUnion(user) });
                addToTimeline(`Reacted with ${emoji} to a shared ${collectionKey.slice(0, -1)}`);
            }
            // Re-open modal to refresh data
            openMediaModal(mediaId, collectionKey.slice(0, -1), null, null);
        };
    });

    // Comment Handler
    document.getElementById('addCommentBtn').onclick = async () => {
        const input = document.getElementById('mediaCommentInput');
        if (!input.value.trim()) return showToast("Comment cannot be empty.", 'error');
        
        const mediaRef = doc(db, collectionKey, mediaId);
        await updateDoc(mediaRef, {
            comments: arrayUnion({
                user: user,
                content: input.value,
                timestamp: Date.now()
            })
        });
        input.value = '';
        addToTimeline(`Added a comment to a shared ${collectionKey.slice(0, -1)}`);
        openMediaModal(mediaId, collectionKey.slice(0, -1), null, null);
    };

    // Delete Handler
    document.getElementById('deleteMediaBtn').onclick = async () => {
        if (!confirm('Are you sure you want to delete this media?')) return;
        try {
            await deleteDoc(doc(db, collectionKey, mediaId));
            // Also delete from favorites if it exists there
            await deleteDoc(doc(db, 'favorites', mediaId)).catch(() => {});
            showToast('Media deleted successfully.', 'success');
            addToTimeline(`Deleted a ${collectionKey.slice(0, -1)} item`);
            document.getElementById('mediaModal')?.classList.remove('active');
        } catch (error) {
            console.error("Deletion error:", error);
            showToast('Failed to delete media.', 'error');
        }
    };

    // Favorite Handler
    document.getElementById('toggleFavoriteBtn').onclick = async (e) => {
        const isFav = e.currentTarget.dataset.isFav === 'true';
        const favoriteRef = doc(db, 'favorites', mediaId);
        
        if (isFav) {
            await deleteDoc(favoriteRef);
            showToast('Removed from favorites.', 'info');
            addToTimeline(`Removed a ${collectionKey.slice(0, -1)} from favorites`);
        } else {
            // Re-fetch media data to save to favorites collection
            const mediaData = (await getDoc(doc(db, collectionKey, mediaId))).data();
            if (mediaData) {
                await setDoc(favoriteRef, { ...mediaData, favoriteTimestamp: serverTimestamp() });
                showToast('Added to favorites! ⭐', 'success');
                addToTimeline(`Added a ${collectionKey.slice(0, -1)} to favorites`);
            }
        }
        // Re-open modal to refresh button state
        openMediaModal(mediaId, collectionKey.slice(0, -1), null, null);
    };
}

document.getElementById('closeMediaModalBtn')?.addEventListener('click', () => {
    document.getElementById('mediaModal')?.classList.remove('active');
});

/* ================= UPLOAD LOGIC (STUBS) ================= */

document.getElementById('photoInput')?.addEventListener('change', (e) => handleFileUpload(e.target.files[0], 'photos', document.getElementById('photoUploadFill')));
document.getElementById('videoInput')?.addEventListener('change', (e) => handleFileUpload(e.target.files[0], 'videos', document.getElementById('videoUploadFill')));

async function handleFileUpload(file, collectionName, progressBarFill) {
    if (!file || !currentUser) return showToast("You must be logged in to upload.", 'error');

    const storagePath = `${collectionName}/${currentUser.uid}/${file.name}_${Date.now()}`;
    const fileRef = storageRef(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, file);
    const isVideo = collectionName === 'videos';
    const mediaType = isVideo ? 'video' : 'photo';

    if (progressBarFill) progressBarFill.parentNode.parentNode.classList.add('active'); // Show upload card
    showToast(`Starting ${mediaType} upload...`, 'info');

    uploadTask.on('state_changed',
        (snapshot) => {
            // Observe state change events such as progress, pause, and resume
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progressBarFill) progressBarFill.style.width = `${progress}%`;
        },
        (error) => {
            // Handle unsuccessful uploads
            console.error("Upload error:", error);
            showToast(`Failed to upload ${mediaType}.`, 'error');
            if (progressBarFill) progressBarFill.parentNode.parentNode.classList.remove('active');
        },
        () => {
            // Handle successful uploads on complete
            getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
                const caption = prompt(`Enter a caption for your ${mediaType}:`) || '';
                const tagsInput = prompt(`Enter tags for your ${mediaType} (comma-separated):`) || '';
                const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

                try {
                    await addDoc(collections[collectionName], {
                        url: downloadURL,
                        user: USER_MAP[currentUser.email],
                        type: mediaType,
                        caption: caption,
                        tags: tags,
                        timestamp: serverTimestamp()
                    });
                    showToast(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} uploaded successfully!`, 'success');
                    addToTimeline(`Uploaded a new ${mediaType}`);
                } catch (e) {
                    console.error("Error adding document: ", e);
                    showToast('Failed to save metadata after upload.', 'error');
                } finally {
                    if (progressBarFill) {
                        progressBarFill.style.width = '0%';
                        progressBarFill.parentNode.parentNode.classList.remove('active');
                    }
                }
            });
        }
    );
}

/* ================= MAP LOGIC ================= */

function initMap() {
    if (mapInstance) {
        mapInstance.invalidateSize();
        return;
    }

    const initialCoords = [40.7128, -74.0060]; // Default to New York
    mapInstance = L.map('mapContainer').setView(initialCoords, 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18,
    }).addTo(mapInstance);

    // Initial load of memory markers
    renderMemoryLocations();
}

function renderMemoryLocations() {
    if (!mapInstance) return;

    // Clear existing memory markers
    memoryMarkers.forEach(m => mapInstance.removeLayer(m));
    memoryMarkers = [];
    
    onSnapshot(query(collections.memories, orderBy('timestamp', 'desc')), (snapshot) => {
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const lat = parseFloat(data.lat);
            const lng = parseFloat(data.lng);
            
            if (isNaN(lat) || isNaN(lng)) return;
            
            const marker = L.marker([lat, lng]).addTo(mapInstance)
                .bindPopup(`<strong>${escapeHtml(data.title)}</strong><br>${escapeHtml(data.description)}<br><small>by ${escapeHtml(data.user)}</small>`);
            
            memoryMarkers.push(marker);
        });
        
        // Only show memory markers by default
        if (document.getElementById('toggleMemories').classList.contains('active')) {
             memoryMarkers.forEach(m => mapInstance.addLayer(m));
        }
    });
}

// Map layer toggles
function renderMediaLocations(isVisible) {
    if (!mapInstance) return;

    // Clear existing media markers
    mediaMarkers.forEach(m => mapInstance.removeLayer(m));
    mediaMarkers = [];

    if (!isVisible) return;

    // Simplified mock data for media locations (In a real app, this would query photos/videos with geo-tags)
    const mockMediaLocations = [
        { lat: 40.7128, lng: -74.0060, title: 'NY Photo' },
        { lat: 34.0522, lng: -118.2437, title: 'LA Video' },
    ];

    mockMediaLocations.forEach(data => {
        const customIcon = L.divIcon({
            className: 'media-marker-icon',
            html: '📷' // Use an emoji or a simple icon
        });
        const marker = L.marker([data.lat, data.lng], { icon: customIcon }).addTo(mapInstance)
            .bindPopup(`Media: ${data.title}`);
        mediaMarkers.push(marker);
    });
}

// Toggle logic for map layers
document.getElementById('toggleMemories')?.addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('toggleMedia')?.classList.remove('active');
    memoryMarkers.forEach(m => mapInstance.addLayer(m));
    renderMediaLocations(false);
});

document.getElementById('toggleMedia')?.addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('toggleMemories')?.classList.remove('active');
    memoryMarkers.forEach(m => mapInstance.removeLayer(m));
    renderMediaLocations(true);
});

// Memory Modal Stub
document.getElementById('addMemoryBtn')?.addEventListener('click', () => {
    document.getElementById('memoryModal')?.classList.add('active');
    // Pre-fill coordinates with current map center (helpful for adding to map)
    if (mapInstance) {
        const center = mapInstance.getCenter();
        document.getElementById('latInput').value = center.lat.toFixed(4);
        document.getElementById('lngInput').value = center.lng.toFixed(4);
    }
});

document.getElementById('cancelMemoryBtn')?.addEventListener('click', () => {
    document.getElementById('memoryModal')?.classList.remove('active');
});

document.getElementById('getCurrentLocation')?.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            document.getElementById('latInput').value = position.coords.latitude.toFixed(4);
            document.getElementById('lngInput').value = position.coords.longitude.toFixed(4);
            showToast('GPS location updated.', 'success');
        }, (error) => {
            console.error("Geolocation error:", error);
            showToast('Failed to get GPS location. Enter manually.', 'error');
        });
    } else {
        showToast('Geolocation not supported by this browser.', 'error');
    }
});

document.getElementById('saveMemoryBtn')?.addEventListener('click', async () => {
    if (!currentUser) return showToast("You must be logged in to save a memory.", 'error');

    const title = document.getElementById('memoryTitle').value.trim();
    const description = document.getElementById('memoryDesc').value.trim();
    const lat = document.getElementById('latInput').value;
    const lng = document.getElementById('lngInput').value;

    if (!title || !lat || !lng) return showToast("Title, Latitude, and Longitude are required.", 'error');

    try {
        await addDoc(collections.memories, {
            title: title,
            description: description,
            lat: lat,
            lng: lng,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
        showToast('Memory saved successfully!', 'success');
        addToTimeline('Added a new map memory');
        document.getElementById('memoryModal')?.classList.remove('active');
        document.getElementById('memoryTitle').value = '';
        document.getElementById('memoryDesc').value = '';

        // Pan map to new memory
        if (mapInstance) mapInstance.setView([parseFloat(lat), parseFloat(lng)], 10);

    } catch (e) {
        console.error("Error saving memory:", e);
        showToast('Failed to save memory.', 'error');
    }
});


/* ================= NOTES LOGIC ================= */

async function addNote(isPinned = false) {
    if (!currentUser) return showToast("You must be logged in to share a note.", 'error');

    const content = document.getElementById('newNoteContent').value.trim();
    if (!content) return showToast("Note content cannot be empty.", 'error');

    try {
        await addDoc(collections.notes, {
            user: USER_MAP[currentUser.email],
            content: content,
            pinned: isPinned,
            timestamp: serverTimestamp()
        });
        showToast('Note shared successfully!', 'success');
        addToTimeline(`Shared a new ${isPinned ? 'pinned ' : ''}note`);
        document.getElementById('newNoteContent').value = '';
    } catch (e) {
        console.error("Error adding note: ", e);
        showToast('Failed to share note.', 'error');
    }
}

function renderNotes() {
    const container = document.getElementById('notesContainer');
    if (!container) return;

    // Listen for all notes, ordered by pinned first, then by date
    onSnapshot(query(collections.notes, orderBy('pinned', 'desc'), orderBy('timestamp', 'desc')), (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const isPinned = data.pinned || false;
            const date = data.timestamp?.toDate()?.toLocaleDateString() || 'Just now';

            const repliesHtml = (data.replies || []).map(reply => `
                <div class="note-reply">
                    <strong>${escapeHtml(reply.user)}:</strong> ${escapeHtml(reply.content)}
                </div>
            `).join('');

            const item = document.createElement('div');
            item.className = 'note-item';
            item.innerHTML = `
                <div class="note-header">
                    <strong>${isPinned ? '📌 PINNED' : 'Note'}</strong> by ${escapeHtml(data.user)}
                    <span class="note-date">${date}</span>
                </div>
                <p class="note-content">${escapeHtml(data.content)}</p>
                ${repliesHtml}
                <div class="note-actions">
                    <span class="reply-link" data-id="${id}">Reply</span>
                    <button class="btn icon-btn small ghost delete-note" data-id="${id}" aria-label="Delete Note">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    ${!isPinned ? `<button class="btn icon-btn small ghost pin-note" data-id="${id}" aria-label="Pin Note">📌</button>` : ''}
                </div>
            `;
            container.appendChild(item);
        });

        // Attach listeners for reply
        container.querySelectorAll('.reply-link').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const reply = prompt("Enter your reply:");
                if (!reply) return;

                const noteRef = doc(db, 'notes', id);
                await updateDoc(noteRef, {
                    replies: arrayUnion({
                        user: USER_MAP[currentUser.email],
                        content: reply,
                        timestamp: Date.now()
                    })
                });
                showToast('Reply added.', 'info');
                addToTimeline('Replied to a shared note');
            });
        });
        
        // Attach listeners for delete
        container.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!confirm('Delete this note?')) return;
                await deleteDoc(doc(db, 'notes', id));
                showToast('Note deleted.', 'info');
                addToTimeline('Deleted a shared note');
            });
        });
        
        // Attach listeners for pin
        container.querySelectorAll('.pin-note').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const noteRef = doc(db, 'notes', id);
                await updateDoc(noteRef, { pinned: true });
                showToast('Note pinned!', 'success');
                addToTimeline('Pinned a shared note');
            });
        });
    });
}

document.getElementById('addNoteBtn')?.addEventListener('click', () => {
    addNote(false); // Add a normal note
});

document.getElementById('pinNoteBtn')?.addEventListener('click', () => {
    addNote(true); // Add a pinned note
});


/* ================= MUSIC/VOICE LOGIC ================= */

let isRecording = false;
const recordBtn = document.getElementById('voiceNoteRecordBtn');
const uploadBtn = document.getElementById('uploadRecordingBtn');
const cancelBtn = document.getElementById('cancelRecordingBtn');
const voiceStatus = document.getElementById('voiceStatus');

async function startRecording() {
    if (!currentUser) return showToast("You must be logged in to record.", 'error');
    if (isRecording) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop()); // Stop mic access
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        recordBtn.innerHTML = '🛑 Stop';
        recordBtn.classList.remove('primary');
        recordBtn.classList.add('secondary');
        voiceStatus.textContent = 'Recording...';
        voiceStatus.classList.remove('hidden');
        voiceStatus.classList.add('blink');
        uploadBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        
        showToast('Recording started.', 'info');

    } catch (err) {
        console.error("Recording error:", err);
        showToast('Failed to start recording. Check microphone permissions.', 'error');
        isRecording = false;
        recordBtn.innerHTML = '🎤 Record';
        recordBtn.classList.remove('secondary');
        recordBtn.classList.add('primary');
    }
}

function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    
    mediaRecorder.stop();
    isRecording = false;
    
    recordBtn.innerHTML = '🎤 Re-record';
    recordBtn.classList.remove('secondary');
    recordBtn.classList.add('primary');
    voiceStatus.textContent = 'Ready to upload.';
    voiceStatus.classList.remove('blink');
    uploadBtn.style.display = 'inline-flex';
    cancelBtn.style.display = 'inline-flex';
}

function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    audioChunks = [];
    isRecording = false;
    
    recordBtn.innerHTML = '🎤 Record';
    recordBtn.classList.remove('secondary');
    recordBtn.classList.add('primary');
    voiceStatus.textContent = 'Ready to record.';
    voiceStatus.classList.remove('blink', 'hidden');
    uploadBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    showToast('Recording cancelled.');
}

async function uploadRecording() {
    if (audioChunks.length === 0 || !currentUser) return showToast("No recording found.", 'error');
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const fileName = `voice_note_${Date.now()}.webm`;
    const storagePath = `voice_notes/${currentUser.uid}/${fileName}`;
    const fileRef = storageRef(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, audioBlob);
    
    showToast("Uploading voice note...", 'info');
    
    uploadTask.on('state_changed',
        (snapshot) => {
            // Update progress if needed
        },
        (error) => {
            console.error("Upload error:", error);
            showToast('Failed to upload voice note.', 'error');
            cancelRecording();
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
                try {
                    await addDoc(collections.music, {
                        url: downloadURL,
                        user: USER_MAP[currentUser.email],
                        type: 'voice',
                        timestamp: serverTimestamp()
                    });
                    showToast('Voice note uploaded successfully!', 'success');
                    addToTimeline('Shared a new voice note');
                    cancelRecording(); // Reset UI
                } catch (e) {
                    console.error("Error saving voice note metadata: ", e);
                    showToast('Failed to save voice note metadata.', 'error');
                    cancelRecording(); // Reset UI
                }
            });
        }
    );
}

// Voice Note Event Handlers
recordBtn?.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});
uploadBtn?.addEventListener('click', uploadRecording);
cancelBtn?.addEventListener('click', cancelRecording);

// Music Link Handler
document.getElementById('addMusicBtn')?.addEventListener('click', async () => {
    if (!currentUser) return showToast("You must be logged in to share music.", 'error');
    const url = document.getElementById('musicUrlInput').value.trim();
    const caption = document.getElementById('musicCaptionInput').value.trim();

    if (!url) return showToast("Please enter an embed URL.", 'error');

    try {
        await addDoc(collections.music, {
            url: url,
            caption: caption,
            user: USER_MAP[currentUser.email],
            type: 'link',
            timestamp: serverTimestamp()
        });
        showToast('Music link shared!', 'success');
        addToTimeline('Shared a music link');
        document.getElementById('musicUrlInput').value = '';
        document.getElementById('musicCaptionInput').value = '';
    } catch (e) {
        console.error("Error adding music link: ", e);
        showToast('Failed to share music link.', 'error');
    }
});

function renderMusic() {
    const list = document.getElementById('musicListContainer');
    const voiceList = document.getElementById('savedMusic');

    // Render shared music links (type: 'link')
    onSnapshot(query(collections.music, orderBy('timestamp', 'desc')), snap => {
        if(!list || !voiceList) return;
        
        list.innerHTML = '';
        voiceList.innerHTML = '';
        
        let linkItems = [];
        let voiceItems = [];

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now';
            const div = document.createElement('div');
            div.className = 'event-item';
            div.style.cssText = 'flex-direction: column; align-items: flex-start; gap: 8px;';
            
            if (data.type === 'voice') {
                // Voice note rendering
                const audioPlayer = `<audio controls src="${escapeHtml(data.url)}" style="width:100%;"></audio>`;
                div.innerHTML = `
                    ${audioPlayer}
                    <div style="font-size:0.85rem; color:var(--subtext);"> Voice Note • ${escapeHtml(data.user)} on ${date} </div>
                `;
                voiceItems.push(div);
            } else if (data.type === 'link') {
                // Music link rendering (using iframe for embeds)
                const mediaElement = `<iframe src="${escapeHtml(data.url)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:12px; height: 80px; width:100%;" frameborder="0" allowfullscreen="" title="Music"></iframe>`;
                div.innerHTML = `
                    ${mediaElement}
                    <p style="margin: 0; font-size: 1rem; font-weight: 500;">${escapeHtml(data.caption || '')}</p>
                    <div style="font-size:0.85rem; color:var(--subtext);"> Shared Music • ${escapeHtml(data.user)} on ${date} </div>
                `;
                linkItems.push(div);
            }
        });
        
        if (voiceItems.length === 0) voiceList.innerHTML = '<p class="subtext-center">No voice notes shared yet.</p>';
        else voiceItems.forEach(item => voiceList.appendChild(item));
        
        if (linkItems.length === 0) list.innerHTML = '<p class="subtext-center">No music links shared yet.</p>';
        else linkItems.forEach(item => list.appendChild(item));
    });
}


/* ================= SCHEDULE / CALENDAR LOGIC ================= */

function renderCalendar() {
    const header = document.getElementById('currentMonthYear');
    const grid = document.getElementById('calendarGrid');
    const eventListContainer = document.getElementById('eventListContainer');
    if (!header || !grid) return;

    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const monthName = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    header.textContent = monthName;
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Fill in empty leading days
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="cal-day empty"></div>`;
    }

    // Fill in days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        let classes = '';
        if (isToday) classes += ' today';
        // You would add .event-day class here if an event exists for this date

        grid.innerHTML += `<div class="cal-day${classes}">${day}</div>`;
    }

    // Attach Nav Listeners (ensure they are only attached once)
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    
    // Prevent multiple listeners
    prevBtn.onclick = null;
    nextBtn.onclick = null;

    prevBtn.onclick = () => {
        currentCalDate.setMonth(currentCalDate.getMonth() - 1);
        renderCalendar();
    };
    nextBtn.onclick = () => {
        currentCalDate.setMonth(currentCalDate.getMonth() + 1);
        renderCalendar();
    };

    // Listen for events in real-time (to render the list below the calendar)
    onSnapshot(query(collections.events, orderBy('timestamp', 'asc')), (snapshot) => {
        if (!eventListContainer) return;
        eventListContainer.innerHTML = '<h3>Upcoming Events</h3>';
        
        if (snapshot.empty) {
            eventListContainer.innerHTML += '<p class="subtext-center">No events planned yet. Tap the button to add one! 🎉</p>';
            return;
        }

        let currentMonthHeader = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const date = data.timestamp instanceof Date ? data.timestamp : data.timestamp.toDate();
            
            // Only show events from the current month onwards
            if (date < new Date(currentCalDate.getFullYear(), currentCalDate.getMonth(), 1)) return;

            const month = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (month !== currentMonthHeader) {
                eventListContainer.innerHTML += `<h4 class="sub-header" style="text-align: left; margin-top: 20px;">${month}</h4>`;
                currentMonthHeader = month;
            }

            const item = document.createElement('div');
            item.className = 'event-item';
            item.innerHTML = `
                <div>
                    <strong>${date.toLocaleDateString()}</strong> - ${escapeHtml(data.title)}
                    <span style="display: block; font-size: 0.85rem; color: var(--subtext);">${escapeHtml(data.description)}</span>
                </div>
                <span style="font-size: 0.9rem; color: var(--subtext);">by ${escapeHtml(data.user)}</span>
            `;
            eventListContainer.appendChild(item);
        });
    });
}

document.getElementById('addEventBtn')?.addEventListener('click', async () => {
    if (!currentUser) return showToast("You must be logged in to add an event.", 'error');

    const title = prompt("Enter event title:");
    if (!title) return;
    const description = prompt("Enter event description (optional):") || '';
    const dateInput = prompt("Enter event date (YYYY-MM-DD):");
    if (!dateInput || !/\d{4}-\d{2}-\d{2}/.test(dateInput)) return showToast("Invalid date format. Use YYYY-MM-DD.", 'error');

    const timestamp = new Date(dateInput);
    if (isNaN(timestamp)) return showToast("Invalid date.", 'error');

    try {
        await addDoc(collections.events, {
            title: title,
            description: description,
            timestamp: timestamp,
            user: USER_MAP[currentUser.email]
        });
        showToast('Event added successfully!', 'success');
        addToTimeline('Added a new event to the schedule');
    } catch (e) {
        console.error("Error adding event:", e);
        showToast('Failed to add event.', 'error');
    }
});


/* ================= TODOS & POLLS LOGIC ================= */

// TODO LOGIC
document.getElementById('addTodoBtn')?.addEventListener('click', async () => {
    if (!currentUser) return showToast("You must be logged in to add a task.", 'error');
    const task = prompt("Enter the new to-do task:");
    if (!task) return;

    try {
        await addDoc(collections.todos, {
            task: task,
            user: USER_MAP[currentUser.email],
            completed: false,
            timestamp: serverTimestamp()
        });
        showToast('Task added.', 'success');
        addToTimeline('Added a new to-do item');
    } catch (e) {
        console.error("Error adding todo:", e);
        showToast('Failed to add task.', 'error');
    }
});

function renderTodos() {
    const container = document.getElementById('todoListContainer');
    if (!container) return;

    onSnapshot(query(collections.todos, orderBy('completed', 'asc'), orderBy('timestamp', 'asc')), (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p class="subtext-center">No tasks! Tap "Add New Task" to start.</p>';
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            const item = document.createElement('div');
            item.className = 'list-item todo-item';
            item.innerHTML = `
                <div class="todo-checkbox${data.completed ? ' completed' : ''}" data-id="${id}" data-completed="${data.completed}"></div>
                <span class="todo-text${data.completed ? ' completed' : ''}">${escapeHtml(data.task)} (${escapeHtml(data.user)})</span>
                <button class="btn icon-btn small ghost delete-todo-btn" data-id="${id}" aria-label="Delete Task">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            container.appendChild(item);
        });

        // Attach listeners for toggle
        container.querySelectorAll('.todo-checkbox').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const completed = e.currentTarget.dataset.completed !== 'true';
                await updateDoc(doc(db, 'todos', id), { completed: completed });
                showToast(completed ? 'Task completed!' : 'Task reopened.', 'info');
                addToTimeline(completed ? 'Completed a to-do item' : 'Reopened a to-do item');
            });
        });

        // Attach listeners for delete
        container.querySelectorAll('.delete-todo-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!confirm('Delete this task?')) return;
                await deleteDoc(doc(db, 'todos', id));
                showToast('Task deleted.', 'info');
                addToTimeline('Deleted a to-do item');
            });
        });
    });
}


// POLLS LOGIC
document.getElementById('addPollBtn')?.addEventListener('click', () => {
    if (!currentUser) return showToast("You must be logged in to create a poll.", 'error');
    
    const question = prompt("Enter the poll question:");
    if (!question) return;

    // Simple way to get options
    let options = prompt("Enter options, separated by commas (e.g., Movie, Restaurant, Stay In):");
    if (!options) return;

    // Create an object where each option is a key and the value is an empty array of voters
    const optionsObj = options.split(',').map(o => o.trim()).filter(o => o.length > 0)
        .reduce((acc, option) => ({ ...acc, [option]: [] }), {});

    if (Object.keys(optionsObj).length < 2) return showToast("Please provide at least two poll options.", 'error');

    try {
        addDoc(collections.polls, {
            question: question,
            options: optionsObj,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
        showToast('Poll created successfully!', 'success');
        addToTimeline('Created a new poll');
    } catch (e) {
        console.error("Error creating poll:", e);
        showToast('Failed to create poll.', 'error');
    }
});

function renderPolls() {
    const container = document.getElementById('pollsContainer');
    if (!container) return;

    onSnapshot(query(collections.polls, orderBy('timestamp', 'desc')), (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p class="subtext-center">No active polls. Tap "Create New Poll" to start.</p>';
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const options = data.options || {};
            const totalVotes = Object.values(options).flat().length;
            const user = USER_MAP[currentUser?.email];

            const item = document.createElement('div');
            item.className = 'poll-item';
            item.innerHTML = `
                <div class="poll-question">${escapeHtml(data.question)}</div>
                <div class="poll-options">
                    ${Object.entries(options).map(([option, voters]) => {
                        const voteCount = voters.length;
                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const userVoted = voters.includes(user);
                        return `
                            <button class="btn ghost poll-option-btn${userVoted ? ' user-voted' : ''}" data-id="${id}" data-option="${escapeHtml(option)}" aria-label="Vote for ${escapeHtml(option)}">
                                <span class="poll-fill" style="width: ${percentage}%;"></span>
                                <span>${escapeHtml(option)}</span>
                                <span style="font-weight: 600;">${voteCount} (${percentage}%)</span>
                            </button>
                        `;
                    }).join('')}
                </div>
                <p style="font-size: 0.8rem; color: var(--subtext); margin-top: 15px;">
                    Total Votes: ${totalVotes} • Created by ${escapeHtml(data.user)}
                </p>
            `;
            container.appendChild(item);
        });

        // Attach listeners for voting
        container.querySelectorAll('.poll-option-btn').forEach(btn => {
            btn.onclick = handleVote;
        });
    });
}

async function handleVote(e) {
    if (!currentUser) return showToast("You must be logged in to vote.", 'error');
    
    const id = e.currentTarget.dataset.id;
    const optionToVote = e.currentTarget.dataset.option;
    const user = USER_MAP[currentUser.email];
    
    if (!user) return showToast("You must be logged in to vote.", 'error');
    
    const pollRef = doc(db, 'polls', id);
    const pollSnap = await getDoc(pollRef);
    if (!pollSnap.exists()) return;
    
    const data = pollSnap.data();
    const currentOptions = data.options;
    
    // Find previous vote and remove it
    let updateFields = {};
    let isTogglingOff = false;

    Object.entries(currentOptions).forEach(([option, voters]) => {
        if (voters.includes(user)) {
            // User already voted for this option, so remove their vote (toggle off)
            if (option === optionToVote) {
                updateFields[`options.${option}`] = arrayRemove(user);
                showToast(`Unvoted from "${option}".`, 'info');
                isTogglingOff = true;
                return;
            }
            // User voted for a different option, remove it
            updateFields[`options.${option}`] = arrayRemove(user);
        }
    });

    // Add the new vote, unless the user was unvoting their current choice
    if (!isTogglingOff) {
        updateFields[`options.${optionToVote}`] = arrayUnion(user);
        showToast(`Voted for "${optionToVote}"!`, 'success');
        addToTimeline(`Voted in a poll: ${optionToVote}`);
    }
    
    try {
        await updateDoc(pollRef, updateFields);
    } catch (error) {
        console.error("Error updating poll:", error);
        showToast('Failed to cast vote.', 'error');
    }
}

/* ================= FAVORITES LOGIC ================= */

function renderFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    if (!favoritesGrid) return;

    onSnapshot(query(collections.favorites, orderBy('favoriteTimestamp', 'desc')), (snapshot) => {
        favoritesGrid.innerHTML = '';
        if (snapshot.empty) {
            favoritesGrid.innerHTML = '<p class="subtext-center">No favorites yet. Add one from a photo or video to see it here! ⭐</p>';
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const isImage = data.type === 'image' || data.type === 'photo';
            const mediaElement = isImage
                ? `<img src="${escapeHtml(data.url)}" alt="Favorite Photo" loading="lazy">`
                : `<video src="${escapeHtml(data.url)}" controls loading="lazy" style="background: black;"></video>`;
            
            const date = data.favoriteTimestamp?.toDate()?.toLocaleDateString() || 'Recently';
            const div = document.createElement('div');
            div.className = 'masonry-item';
            div.innerHTML = `
                <div class="media-container" style="cursor: pointer;">
                    ${mediaElement}
                </div>
                <div class="item-meta">
                    <span title="Favorited on ${date}">⭐ ${date}</span>
                    <button class="btn icon-btn ghost small media-options-btn" data-id="${id}" data-type="${data.type}" data-url="${data.url}" data-caption="${escapeHtml(data.caption || '')}" aria-label="Media Options">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                    </button>
                </div>
            `;
            
            // Handler for opening media
            div.querySelector('.media-container')?.addEventListener('click', () => {
                openLightbox(data.url, data.type, data.caption);
            });
            
            // Handler for media options modal (use the original collection for options)
            div.querySelector('.media-options-btn')?.addEventListener('click', (e) => {
                const button = e.currentTarget;
                // Note: favorites is its own collection, but for options, we refer back to the original type/id
                const originalType = (button.dataset.type === 'photo' || button.dataset.type === 'image') ? 'photos' : button.dataset.type === 'video' ? 'videos' : button.dataset.type;
                openMediaModal(button.dataset.id, button.dataset.type, button.dataset.url, button.dataset.caption);
            });

            favoritesGrid.appendChild(div);
        });
    });
}


/* ================= CHECK-IN / MOOD LOGGING LOGIC ================= */

let selectedMood = null;

document.querySelectorAll('.mood-emoji').forEach(el => {
    el.addEventListener('click', (e) => {
        selectedMood = e.target.dataset.mood;
        document.querySelectorAll('.mood-emoji').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        document.getElementById('saveMoodBtn').disabled = false;
        document.getElementById('saveMoodBtn').classList.remove('ghost');
        document.getElementById('saveMoodBtn').classList.add('primary');
    });
});

document.getElementById('saveMoodBtn')?.addEventListener('click', async () => {
    if (!currentUser || !selectedMood) return showToast("Please select a mood first.", 'error');
    
    try {
        await addDoc(collections.checkins, {
            user: USER_MAP[currentUser.email],
            mood: selectedMood,
            timestamp: serverTimestamp()
        });
        showToast(`Mood logged as ${selectedMood}!`, 'success');
        addToTimeline(`Logged their mood as ${selectedMood}`);
        
        // Reset UI
        selectedMood = null;
        document.querySelectorAll('.mood-emoji').forEach(o => o.classList.remove('selected'));
        document.getElementById('saveMoodBtn').disabled = true;
        document.getElementById('saveMoodBtn').classList.remove('primary');
        document.getElementById('saveMoodBtn').classList.add('ghost');

    } catch (e) {
        console.error("Error logging mood:", e);
        showToast('Failed to log mood.', 'error');
    }
});

function renderCheckins() {
    if (!currentUserProfile) return;
    document.getElementById('currentUserMoodName').textContent = currentUserProfile.displayName;

    const canvas = document.getElementById('moodChartCanvas');
    if (!canvas) return;

    onSnapshot(query(collections.checkins, orderBy('timestamp', 'desc'), limit(30)), (snapshot) => {
        const moodData = {
            Happy: 0, Content: 0, Neutral: 0, Tired: 0, Stressed: 0, Anxious: 0, Sad: 0
        };
        
        // Calculate mood frequency
        snapshot.forEach(doc => {
            const data = doc.data();
            if (moodData.hasOwnProperty(data.mood)) {
                moodData[data.mood]++;
            }
        });

        const labels = Object.keys(moodData);
        const dataValues = Object.values(moodData);
        
        const backgroundColors = [
            '#34C759', // Happy (Success)
            '#FDD651', // Content (Yellow)
            '#8E8E93', // Neutral (Subtext)
            '#1F77B4', // Tired (Blue)
            '#FF9500', // Stressed (Orange)
            '#FF3B30', // Anxious (Error)
            '#5856D6'  // Sad (Indigo)
        ];

        const config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Mood Frequency (Last 30 Logs)',
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'var(--line-color)' },
                        ticks: { color: 'var(--subtext)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: 'var(--subtext)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                }
            }
        };

        // Destroy existing chart instance before creating a new one
        if (moodChart) {
            moodChart.destroy();
        }

        // Initialize new chart
        moodChart = new Chart(canvas, config);
    });
}


/* ================= INIT ================= */
function initApp() {
    // Show the main container once the user is authenticated and data is ready to load
    // This is the CRITICAL line that enables the app content after login
    const mainContainer = document.getElementById('mainAppContainer');
    if(mainContainer) mainContainer.style.display = 'block';

    updateTimeTogether();
    renderGallery('photos');
    renderGallery('videos');
    renderNotes();
    renderMusic();
    renderTimeline();
    renderFavorites();
    renderDashboard(); // Initialize dashboard view

    // Theme
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        const t = document.getElementById('darkModeToggle');
        if(t) t.checked = true;
    }
    
    // Manually activate dashboard tab on login
    document.querySelector('.tab-btn[data-section="dashboard"])')?.click();
}


/* ================= INITIALIZATION & THEME ================= */
document.getElementById('darkModeToggle')?.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
});

// Close lightbox shortcut shortcut
document.querySelectorAll('.close-lightbox').forEach(el => el.addEventListener('click', closeLightbox));
