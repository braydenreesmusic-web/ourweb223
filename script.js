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
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: var(--surface); color: var(--text); padding: 12px 18px; 
        border-radius: 28px; margin-bottom: 10px; box-shadow: var(--shadow);
        border: 1px solid var(--border); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;
        animation: slideIn 0.25s ease;
    `;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span style="font-size:16px">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2600);
}

function escapeHtml(str) {
    return !str ? '' : String(str).replace(/[&<>"']/g, m => ({ '&':'&','<':'<','>':'>','"':'"','\'':''' })[m]);
}

/* ================= LOGIN & AUTH (FIXED) ================= */

/**
 * Handles profile selection in the login modal.
 * This function also sets the necessary classes for the button styling.
 * @param {string} user - 'brayden' or 'youna'.
 */
function selectProfile(user) {
    console.log(`Profile selected: ${user}`); // DEBUG LOG to confirm click is registered
    selectedUser = user;
    if (authEmailInput) authEmailInput.value = USER_CREDENTIALS[user].email;
    
    // UI updates for buttons: make selected primary, unselected ghost
    braydenLoginBtn?.classList.remove('active', 'primary', 'ghost');
    younaLoginBtn?.classList.remove('active', 'primary', 'ghost');

    const selectedBtn = document.getElementById(`${user}Login`);
    const otherBtn = document.getElementById(`${user === 'brayden' ? 'youna' : 'brayden'}Login`);

    selectedBtn?.classList.add('active', 'primary');
    otherBtn?.classList.add('ghost');
    
    // Clear password when switching profiles for clarity
    if (authPasswordInput) authPasswordInput.value = '';
    
    // The email input is no longer readonly, but we still fill it on button click
    if (authPasswordInput) authPasswordInput.disabled = false;
    authPasswordInput?.focus();
    
    checkFormValidity();
}

/**
 * Checks if the sign-in button should be enabled.
 */
function checkFormValidity() {
    const passwordValid = authPasswordInput?.value?.length > 0;
    // FIX: Check if email field is also populated, as it's no longer readonly (Bug: sign in button disabled)
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

/**
 * Handles the actual sign-in process with Firebase Auth.
 */
async function handleSignIn() {
    // FIX: Removed !selectedUser check, now only rely on input validity (Bug: cannot log in)
    if (signInBtn.disabled) return;
    
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    
    console.log(`Attempting login for: ${email}`); // DEBUG LOG

    if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
    }

    try {
        if (signInBtn) signInBtn.textContent = 'Signing In...';
        if (signInBtn) signInBtn.disabled = true;

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // FIX: Determine profile from authenticated email for robustness (Bug: profile mismatch/cannot log in)
        const userKey = Object.keys(USERS).find(key => USERS[key] === userCredential.user.email);
        
        if (userKey) {
            currentUserProfile = USER_CREDENTIALS[userKey];
        } else {
            // Fallback for an unknown but authenticated user
            currentUserProfile = { displayName: userCredential.user.email, email: userCredential.user.email };
        }
        
        currentUser = userCredential.user;
        showToast(`Welcome back, ${currentUserProfile.displayName}!`, 'success');

        hideLogin();
        // onAuthStateChanged will handle initApp()

        // Re-enable button on success state (though it will be hidden by hideLogin)
        if (signInBtn) signInBtn.textContent = 'Sign In';
        
    } catch (error) {
        console.error('Sign In Error:', error.message);
        // CRITICAL FIX: Enhanced error messaging for common Firebase errors
        let displayError;
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            displayError = 'Login failed. Invalid email or password. Please check your credentials.';
        } else {
            // This will show a clear error message even if the toast system is somehow failing
            displayError = `Login failed. An unexpected error occurred: ${error.code || error.message}.`;
        }

        showToast(displayError, 'error');
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

// --- Attach Login Event Listeners (FIXED) ---
braydenLoginBtn?.addEventListener('click', () => selectProfile('brayden'));
younaLoginBtn?.addEventListener('click', () => selectProfile('youna'));
authPasswordInput?.addEventListener('input', checkFormValidity);
authEmailInput?.addEventListener('input', checkFormValidity); // Check validity on email input too
signInBtn?.addEventListener('click', handleSignIn);

// Handle Enter keypress in password field
authPasswordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !signInBtn.disabled) {
        handleSignIn();
    }
});


// Logout Functionality
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        if (currentUser) {
            // Clear RTDB presence for the logged-in user
            await set(ref(rtdb, `presence/${USER_MAP[currentUser.email]}`), { status: 'offline', timestamp: Date.now() });
        }
        await signOut(auth);
        showToast('You have been signed out.', 'info');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed. Try again.', 'error');
    }
});


// --- Authentication State Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Determine the profile based on the authenticated email
        const userKey = user.email === USERS.brayden ? 'brayden' : 'youna';
        currentUserProfile = USER_CREDENTIALS[userKey];
        currentUser = user;
        // Ensure the correct profile is visually selected in case the user reloads while logged in
        selectProfile(userKey);
        hideLogin();
        setupPresence(user);
        updateUserDisplay(user);
        initApp(); // Call initApp once authenticated
    } else {
        // Force initial state setup for login
        selectedUser = null;
        currentUserProfile = null;
        currentUser = null;
        if(authEmailInput) authEmailInput.value = '';
        if(authPasswordInput) authPasswordInput.value = '';
        checkFormValidity();
        
        // Automatically select Brayden on initial load if no one is logged in
        if (braydenLoginBtn && !braydenLoginBtn.classList.contains('active') && !younaLoginBtn.classList.contains('active')) {
             selectProfile('brayden');
        }
        updateUserDisplay(null); // Reset user display
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
            <span class="stat-label">B/Y Contributions</span>
        </div>
    `;
}

function renderMilestones() {
    const container = document.getElementById('milestonesContent');
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
            const date = data.timestamp ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            container.innerHTML += `
                <div class="event-item" style="border-bottom: 1px solid var(--border); font-size: 0.95rem;">
                    <span style="color:var(--primary); font-weight: 500;">${escapeHtml(data.user)}</span>
                    <p style="margin:0; font-style: italic;">${escapeHtml(data.action)}</p>
                    <span style="font-size:0.75rem; color:var(--subtext); margin-left: auto;">${date}</span>
                </div>
            `;
        });
    });
}

function renderDashboard() {
    renderWeather();
    renderStats();
    renderMilestones();
    renderRecent();
}

/* ================= GALLERY LOGIC (PHOTOS/VIDEOS) ================= */

function renderGallery(collectionName) {
    const container = document.getElementById(`${collectionName}Gallery`);
    if(!container) return;
    
    onSnapshot(query(collections[collectionName], orderBy('timestamp', 'desc')), (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const media = collectionName === 'photos' ?
                `<img src="${escapeHtml(data.url)}" loading="lazy" alt="photo">` :
                `<video src="${escapeHtml(data.url)}" controls></video>`;
            const item = document.createElement('div');
            item.className = 'masonry-item';
            item.innerHTML = `
                ${media}
                <div class="item-meta">
                    <span class="subtext">Uploaded by: ${escapeHtml(data.user)}</span>
                    <button class="btn icon-btn small media-options-btn" data-id="${docSnap.id}" data-collection="${collectionName}" aria-label="Media Options">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                    </button>
                </div>
                <div class="media-tag-list">${(data.tags || []).map(tag => `<span class="media-tag">${escapeHtml(tag)}</span>`).join('')}</div>
            `;
            container.appendChild(item);
            
            // Attach click handler for opening media
            item.querySelector(collectionName === 'photos' ? 'img' : 'video')?.addEventListener('click', (e) => {
                // Prevent video controls from firing lightbox
                if (e.target.tagName.toLowerCase() === 'video' && e.target.closest('.masonry-item video[controls]')) return;
                openLightbox(data.url, collectionName === 'photos' ? 'image' : 'video', data.caption);
            });

            // Attach click handler for media options
            item.querySelector('.media-options-btn')?.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop event bubbling to openLightbox/image
                openMediaModal(docSnap.id, collectionName);
            });
        });
    });
}

function openLightbox(url, type, caption = '') {
    const lightbox = document.getElementById('lightbox');
    const mediaContainer = document.querySelector('#lightbox .lightbox-media-container');
    const captionElement = document.querySelector('#lightbox .lightbox-caption');

    if (!lightbox || !mediaContainer) return;

    mediaContainer.innerHTML = '';
    let mediaElement;
    
    if (type === 'image') {
        mediaElement = document.createElement('img');
        mediaElement.src = url;
        mediaElement.alt = 'Shared photo';
        mediaElement.style.maxWidth = '100%';
        mediaElement.style.maxHeight = '100%';
        mediaElement.style.borderRadius = '14px';
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

// Global click listeners for lightbox close (Defined at end of file)
document.querySelector('#lightbox .close-lightbox')?.addEventListener('click', closeLightbox);
document.querySelector('#lightbox .lightbox-backdrop')?.addEventListener('click', closeLightbox);


/* ================= MEDIA OPTIONS MODAL LOGIC ================= */

/**
 * Opens a modal to display media options like tags, comments, etc.
 * @param {string} docId - The Firestore document ID.
 * @param {string} collectionName - 'photos' or 'videos'.
 */
async function openMediaModal(docId, collectionName) {
    const modal = document.getElementById('mediaModal');
    const title = document.getElementById('mediaModalTitle');
    const content = document.getElementById('mediaModalContent');
    if (!modal || !title || !content || !currentUser) return;
    
    // Clear previous content
    title.textContent = 'Loading...';
    content.innerHTML = '';
    
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            title.textContent = 'Media Not Found';
            return;
        }
        
        const data = docSnap.data();
        title.textContent = `${collectionName === 'photos' ? 'Photo' : 'Video'} Options`;
        
        const isImage = collectionName === 'photos';
        const mediaEmbed = isImage
            ? `<img src="${escapeHtml(data.url)}" style="max-width:100%; border-radius:12px; display:block; margin-bottom:15px;" alt="media">`
            : `<video src="${escapeHtml(data.url)}" controls style="max-width:100%; border-radius:12px; display:block; margin-bottom:15px;"></video>`;

        // Tag Input
        const tagInputHtml = `
            <h4 style="margin-bottom: 8px;">Tags</h4>
            <div class="media-tag-list" id="currentTags">${(data.tags || []).map(tag => `<span class="media-tag">${escapeHtml(tag)}</span>`).join('')}</div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <input type="text" id="newTagInput" placeholder="Add a new tag" class="glass-input" style="flex-grow: 1;">
                <button id="addTagBtn" class="btn secondary small">Add</button>
            </div>
            <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;">
        `;
        
        // Favorite Button
        const userEmail = currentUser.email;
        const isFavorited = (data.favoritedBy || []).includes(userEmail);
        const favoriteBtnHtml = `
            <button id="toggleFavoriteBtn" class="btn ${isFavorited ? 'primary' : 'ghost'} full-width" style="margin-bottom: 20px;">
                ${isFavorited ? '★ Favorited' : '☆ Add to Favorites'}
            </button>
        `;

        // Reactions
        const reactionEmojis = ['❤️', '😂', '😮', '😢', '🔥'];
        const reactions = data.reactions || {};
        const reactionsHtml = `
            <h4 style="margin-bottom: 8px;">Reactions</h4>
            <div class="reaction-pills">
                ${reactionEmojis.map(emoji => {
                    const count = (reactions[emoji] || []).length;
                    const userVoted = (reactions[emoji] || []).includes(USER_MAP[currentUser.email]);
                    return `<span class="reaction-pill ${userVoted ? 'user-reacted' : ''}" data-emoji="${emoji}">${emoji} ${count > 0 ? count : ''}</span>`;
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
                <input type="text" id="commentInput" placeholder="Add a comment" class="glass-input" style="flex-grow: 1;">
                <button id="addCommentBtn" class="btn secondary small">Send</button>
            </div>
        `;

        content.innerHTML = mediaEmbed + favoriteBtnHtml + tagInputHtml + reactionsHtml + commentsHtml;
        modal.classList.add('active');

        // Add Tag Listener
        document.getElementById('addTagBtn').onclick = async () => {
            const tag = document.getElementById('newTagInput').value.trim();
            if(!tag) return;
            await updateDoc(docRef, { tags: arrayUnion(tag) });
            document.getElementById('newTagInput').value = '';
            openMediaModal(docId, collectionName); // Re-render modal with updated data
            showToast(`Added tag: ${tag}`);
        };
        
        // Toggle Favorite Listener
        document.getElementById('toggleFavoriteBtn').onclick = async () => {
            if (isFavorited) {
                await updateDoc(docRef, {
                    favoritedBy: arrayRemove(userEmail)
                });
                showToast("Removed from Favorites.");
            } else {
                await updateDoc(docRef, {
                    favoritedBy: arrayUnion(userEmail),
                    favoritedTimestamp: serverTimestamp() // Add a specific timestamp for sorting
                });
                showToast("Added to Favorites! ★");
            }
            openMediaModal(docId, collectionName);
        };

        // Add Reaction Listener (Delegated)
        document.querySelectorAll('.reaction-pill').forEach(pill => {
            pill.onclick = async () => {
                const emoji = pill.dataset.emoji;
                const user = USER_MAP[currentUser.email];
                const currentData = (await getDoc(docRef)).data();
                const currentReactions = currentData.reactions || {};
                
                if ((currentReactions[emoji] || []).includes(user)) {
                    // Remove reaction
                    await updateDoc(docRef, {
                        [`reactions.${emoji}`]: arrayRemove(user)
                    });
                } else {
                    // Remove user's existing vote from ALL other reactions first
                    let updateFields = {};
                    reactionEmojis.forEach(e => {
                         // Only remove if they are in the list for that emoji
                        if ((currentReactions[e] || []).includes(user)) {
                            updateFields[`reactions.${e}`] = arrayRemove(user);
                        }
                    });
                    
                    // Add the new reaction
                    updateFields[`reactions.${emoji}`] = arrayUnion(user);
                    
                    await updateDoc(docRef, updateFields);
                }
                openMediaModal(docId, collectionName); // Re-render modal
            };
        });
        
        // Add Comment Listener
        document.getElementById('addCommentBtn').onclick = async () => {
            const commentInput = document.getElementById('commentInput');
            const content = commentInput.value.trim();
            if(!content) return;
            
            await updateDoc(docRef, {
                comments: arrayUnion({
                    user: USER_MAP[currentUser.email],
                    content: content,
                    timestamp: Date.now()
                })
            });
            commentInput.value = '';
            openMediaModal(docId, collectionName);
            showToast("Comment posted.");
        };

        // Close button listener (already attached via event delegation outside)
        
    } catch (e) {
        console.error("Error opening media modal:", e);
        title.textContent = 'An error occurred';
    }
}

document.getElementById('closeMediaModalBtn')?.addEventListener('click', () => {
    document.getElementById('mediaModal')?.classList.remove('active');
});


/* ================= UPLOAD LOGIC (STUBS) ================= */

// Stub for media uploads
document.getElementById('photoInput')?.addEventListener('change', (e) => handleFileUpload(e.target.files[0], 'photos', document.getElementById('photoUploadFill')));
document.getElementById('videoInput')?.addEventListener('change', (e) => handleFileUpload(e.target.files[0], 'videos', document.getElementById('videoUploadFill')));

async function handleFileUpload(file, collectionName, progressBarFill) {
    if (!file || !currentUser) return showToast("You must be logged in to upload.", 'error');

    const storagePath = `${collectionName}/${currentUser.uid}/${file.name}_${Date.now()}`;
    const fileRef = storageRef(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    const isVideo = collectionName === 'videos';
    const mediaType = isVideo ? 'video' : 'photo';

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
            if (progressBarFill) progressBarFill.style.width = '0%';
        },
        () => {
            // Handle successful uploads on complete
            getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
                try {
                    await addDoc(collections[collectionName], {
                        url: downloadURL,
                        user: USER_MAP[currentUser.email],
                        timestamp: serverTimestamp(),
                        tags: [],
                        caption: '',
                        location: null, // Add location later
                        reactions: {},
                        comments: [],
                        favoritedBy: []
                    });
                    showToast(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} uploaded successfully!`, 'success');
                    addToTimeline(`Uploaded a new ${mediaType}`);
                } catch (e) {
                    console.error("Firestore error after upload:", e);
                    showToast(`Failed to save ${mediaType} data.`, 'error');
                } finally {
                    if (progressBarFill) progressBarFill.style.width = '0%';
                }
            });
        }
    );
}

/* ================= MAP LOGIC (STUBS) ================= */

// Fix: These functions were called but not defined, causing the app to crash on navigation.

function initMap() {
    // Check if map is already initialized
    const mapElement = document.getElementById('mapContainer');
    if (mapInstance || !mapElement) {
        mapInstance?.invalidateSize();
        return;
    }

    mapInstance = L.map('mapContainer', {
        center: [39.8283, -98.5795], // Center of USA
        zoom: 4,
        zoomControl: false,
        attributionControl: false // Hide default Leaflet attribution
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapInstance);

    // Initial load of layers
    renderMemories();
    renderMediaLocations(mediaVisible);
}

function renderMemories() {
    if (!mapInstance) return;
    
    // Clear existing markers
    memoryMarkers.forEach(m => mapInstance.removeLayer(m));
    memoryMarkers = [];

    onSnapshot(collections.memories, (snapshot) => {
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.location) {
                const marker = L.marker([data.location.lat, data.location.lng]).addTo(mapInstance)
                    .bindPopup(`<b>${escapeHtml(data.title)}</b><br>${escapeHtml(data.description)}`);
                memoryMarkers.push(marker);
            }
        });
    });
}

function renderMediaLocations(isVisible) {
    if (!mapInstance) return;
    
    // Clear existing media markers
    mediaMarkers.forEach(m => mapInstance.removeLayer(m));
    mediaMarkers = [];
    
    if (!isVisible) return;

    // Simplified mock data for media locations
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
});
document.getElementById('cancelMemoryBtn')?.addEventListener('click', () => {
    document.getElementById('memoryModal')?.classList.remove('active');
});
document.getElementById('saveMemoryBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('memoryTitle').value;
    const desc = document.getElementById('memoryDesc').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    
    if (!title || isNaN(lat) || isNaN(lng)) {
        return showToast("Please fill in title and valid coordinates.", 'error');
    }

    try {
        await addDoc(collections.memories, {
            user: USER_MAP[currentUser.email],
            title: title,
            description: desc,
            location: { lat: lat, lng: lng },
            timestamp: serverTimestamp()
        });
        showToast("Memory saved!");
        document.getElementById('memoryModal')?.classList.remove('active');
        renderMemories(); // Re-render map layer
    } catch (e) {
        console.error("Error saving memory:", e);
        showToast("Failed to save memory.", 'error');
    }
});

/* ================= MUSIC LOGIC (STUBS) ================= */

// Simplified search function
document.getElementById('musicSearchBtn')?.addEventListener('click', () => {
    const input = document.getElementById('musicSearchInput').value.trim();
    const resultsDiv = document.getElementById('musicSearchResults');
    if (!input) return;
    
    // Mock search results
    const results = [
        { title: `Mock Song 1 for "${input}"`, url: 'https://open.spotify.com/embed/track/1y2Y8fG04d80o9z7t1K5I4?utm_source=generator&theme=0', type: 'music' },
        { title: `Mock Song 2 for "${input}"`, url: 'https://open.spotify.com/embed/track/5y4h6jP8J4SgT1z9n3n00k?utm_source=generator&theme=0', type: 'music' }
    ];
    
    resultsDiv.innerHTML = results.map((r, i) => `
        <div class="search-result-item">
            <p>${r.title}</p>
            <button class="btn primary small share-music-btn" data-url="${r.url}" data-title="${r.title}">Share</button>
        </div>
    `).join('');
    resultsDiv.classList.remove('hidden');
    
    document.querySelectorAll('.share-music-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleShareMusic(e.target.dataset.url, e.target.dataset.title));
    });
});

async function handleShareMusic(url, title) {
    if (!currentUser) return showToast("You must be logged in to share music.", 'error');
    try {
        await addDoc(collections.music, {
            url: url,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp(),
            type: 'music',
            title: title
        });
        showToast("Music shared!");
        addToTimeline(`Shared a new song: ${title}`);
        document.getElementById('musicSearchResults')?.classList.add('hidden');
    } catch (e) {
        console.error("Error sharing music:", e);
        showToast("Failed to share music.", 'error');
    }
}

function renderMusic() {
    const list = document.getElementById('sharedMusic');
    const voiceList = document.getElementById('savedMusic');

    // Render shared music
    onSnapshot(query(collections.music, orderBy('timestamp', 'desc')), snap => {
        if(!list) return;
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now';
            const div = document.createElement('div');
            div.className = 'event-item';
            div.style.cssText = 'flex-direction: column; align-items: flex-start; gap: 8px;';
            
            let mediaElement;
            if (data.type === 'voice') {
                 // Voice note rendering is separate
                 return;
            } else {
                mediaElement = `<iframe src="${escapeHtml(data.url)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:12px; height: 80px; width:100%;" frameborder="0" allowfullscreen="" title="Music"></iframe>`;
            }
            
            div.innerHTML = `
                ${mediaElement}
                <div style="font-size:0.85rem; color:var(--subtext);">
                    Shared Music • ${escapeHtml(data.user)} on ${date}
                </div>
            `;
            list.appendChild(div);
        });
    });
    
    // Render voice notes (filtering by type: 'voice')
    onSnapshot(query(collections.music, orderBy('timestamp', 'desc')), snap => {
        if(!voiceList) return;
        voiceList.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.type !== 'voice') return;
            
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now';
            const div = document.createElement('div');
            div.className = 'event-item';
            div.style.cssText = 'flex-direction: column; align-items: flex-start; gap: 8px;';
            
            const mediaElement = `<audio controls src="${escapeHtml(data.url)}"></audio>`;
            
            div.innerHTML = `
                ${mediaElement}
                <div style="font-size:0.85rem; color:var(--subtext);">
                    Voice Note • ${escapeHtml(data.user)} on ${date}
                </div>
            `;
            voiceList.appendChild(div);
        });
    });
}

// Voice Note Recording Logic
document.getElementById('voiceNoteRecordBtn')?.addEventListener('click', toggleRecording);
document.getElementById('uploadRecordingBtn')?.addEventListener('click', uploadRecording);
document.getElementById('cancelRecordingBtn')?.addEventListener('click', cancelRecording);

function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            
            // Update UI
            const recordBtn = document.getElementById('voiceNoteRecordBtn');
            const uploadBtn = document.getElementById('uploadRecordingBtn');
            const cancelBtn = document.getElementById('cancelRecordingBtn');
            const status = document.getElementById('voiceStatus');

            if(recordBtn) recordBtn.innerHTML = '🛑 Stop Recording';
            if(uploadBtn) uploadBtn.style.display = 'none';
            if(cancelBtn) cancelBtn.style.display = 'none';
            if(status) { status.textContent = 'Recording...'; status.classList.remove('hidden'); }

            showToast('Recording started...');
        })
        .catch(err => {
            console.error('Recording error:', err);
            showToast('Microphone access denied or failed.', 'error');
        });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        
        // Update UI
        const recordBtn = document.getElementById('voiceNoteRecordBtn');
        const uploadBtn = document.getElementById('uploadRecordingBtn');
        const cancelBtn = document.getElementById('cancelRecordingBtn');
        const status = document.getElementById('voiceStatus');

        if(recordBtn) recordBtn.innerHTML = '🎤 Re-record';
        if(uploadBtn) uploadBtn.style.display = 'inline-block';
        if(cancelBtn) cancelBtn.style.display = 'inline-block';
        if(status) status.classList.add('hidden');
        
        showToast('Recording stopped. Ready to upload.');
    }
}

function cancelRecording() {
    audioChunks = [];
    mediaRecorder = null;
    
    const recordBtn = document.getElementById('voiceNoteRecordBtn');
    const uploadBtn = document.getElementById('uploadRecordingBtn');
    const cancelBtn = document.getElementById('cancelRecordingBtn');

    if(recordBtn) recordBtn.innerHTML = '🎤 Record';
    if(uploadBtn) uploadBtn.style.display = 'none';
    if(cancelBtn) cancelBtn.style.display = 'none';
    
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
                        timestamp: serverTimestamp(),
                        type: 'voice'
                    });
                    showToast('Voice note shared successfully!', 'success');
                    addToTimeline('Shared a voice note');
                } catch (e) {
                    console.error("Firestore error after upload:", e);
                    showToast('Failed to save voice note data.', 'error');
                } finally {
                    cancelRecording(); // Reset UI regardless of success/fail
                }
            });
        }
    );
}


/* ================= NOTES LOGIC ================= */

document.getElementById('pinNoteBtn')?.addEventListener('click', async () => {
    const textarea = document.getElementById('noteInput');
    const txt = textarea.value.trim();
    if(!txt || !currentUser) return showToast("Note is empty.", "error");

    await addDoc(collections.notes, {
        content: txt,
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp(),
        pinned: true,
        replies: []
    });
    textarea.value = '';
    addToTimeline("Pinned a new note");
    showToast("Note Pinned!");
});

document.getElementById('saveNoteBtn')?.addEventListener('click', async () => {
    const textarea = document.getElementById('noteInput');
    const txt = textarea.value.trim();
    const parentId = textarea.dataset.parentId;
    if(!txt || !currentUser) return;

    if (parentId) {
        // Handle Reply
        await updateDoc(doc(db, 'notes', parentId), {
            replies: arrayUnion({
                content: txt,
                user: USER_MAP[currentUser.email],
                timestamp: Date.now()
            })
        });
        textarea.dataset.parentId = '';
        textarea.placeholder = "Write a note...";
        addToTimeline(`Replied to a note`);
        showToast("Reply sent.");
    } else {
        // Handle New Parent Note
        await addDoc(collections.notes, {
            content: txt,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp(),
            pinned: false,
            replies: []
        });
        addToTimeline("Left a note");
        showToast("Note saved.");
    }
    textarea.value = '';
});

function renderNotes() {
    const list = document.getElementById('notesList');
    onSnapshot(query(collections.notes, orderBy('pinned', 'desc'), orderBy('timestamp', 'desc')), snap => {
        if(!list) return;
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now';
            
            const isPinned = data.pinned;
            const item = document.createElement('div');
            item.className = 'list-item note-item';
            
            // Build replies
            const repliesHtml = (data.replies || []).map(reply => `
                <div class="note-reply">
                    <strong>${escapeHtml(reply.user)}:</strong> ${escapeHtml(reply.content)}
                </div>
            `).join('');

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
                </div>
            `;
            list.appendChild(item);
        });

        // Attach Reply Listeners
        list.querySelectorAll('.reply-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const parentId = e.target.dataset.id;
                const textarea = document.getElementById('noteInput');
                if(textarea) {
                    textarea.dataset.parentId = parentId;
                    textarea.placeholder = `Replying to note... (ID: ${parentId})`;
                    textarea.focus();
                }
            });
        });
        
        // Attach Delete Listeners
        list.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                await deleteDoc(doc(db, 'notes', id));
                showToast("Note deleted.", 'info');
                addToTimeline("Deleted a note");
            });
        });
    });
}


/* ================= CALENDAR & EVENTS LOGIC ================= */

document.getElementById('addEventBtn')?.addEventListener('click', () => {
    // Mock for now: show a simple prompt
    const title = prompt("Enter event title:");
    if (!title) return;
    const dateStr = prompt("Enter date and time (e.g., 2024-12-25 18:00):");
    if (!dateStr || isNaN(new Date(dateStr))) return showToast("Invalid date format.", 'error');

    addDoc(collections.events, {
        user: USER_MAP[currentUser.email],
        title: title,
        timestamp: new Date(dateStr), // Storing as Date object for sorting
        location: '',
        details: ''
    }).then(() => {
        showToast("Event added!");
        addToTimeline(`Scheduled a new event: ${title}`);
    }).catch(e => {
        console.error("Error adding event:", e);
        showToast("Failed to add event.", 'error');
    });
});

function renderCalendar() {
    // This function now only handles the month navigation UI and rendering the grid.
    const monthYearSpan = document.getElementById('monthYear');
    const grid = document.getElementById('calendarGrid');
    const eventListContainer = document.getElementById('calendarContainer');
    if (!monthYearSpan || !grid) return;

    // Update Month/Year Header
    monthYearSpan.textContent = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Render Grid
    grid.innerHTML = '';
    const startOfMonth = new Date(currentCalDate.getFullYear(), currentCalDate.getMonth(), 1);
    const endOfMonth = new Date(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1, 0);
    const numDays = endOfMonth.getDate();
    let startDay = startOfMonth.getDay(); // 0=Sunday, 6=Saturday

    // Add empty cells for preceding days
    for (let i = 0; i < startDay; i++) {
        grid.innerHTML += '<div></div>';
    }

    // Add day cells
    for (let day = 1; day <= numDays; day++) {
        grid.innerHTML += `<div class="cal-day">${day}</div>`;
    }

    // Attach Nav Listeners (ensure they are only attached once)
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
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
                eventListContainer.innerHTML += `<h4 class="month-header">${month}</h4>`;
                currentMonthHeader = month;
            }

            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            eventListContainer.innerHTML += `
                <div class="event-item" data-id="${docSnap.id}">
                    <div class="event-date">${date.getDate()}</div>
                    <div class="event-details">
                        <strong>${escapeHtml(data.title)}</strong>
                        <span class="subtext">${time} by ${escapeHtml(data.user)}</span>
                    </div>
                </div>
            `;
        });
    });
}


/* ================= TODO LISTS & POLLS LOGIC ================= */

document.getElementById('addTodoBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('todoInput');
    const task = input.value.trim();
    if(!task || !currentUser) return showToast("Task cannot be empty.", 'error');

    await addDoc(collections.todos, {
        task: task,
        user: USER_MAP[currentUser.email],
        completed: false,
        timestamp: serverTimestamp()
    });
    input.value = '';
    addToTimeline(`Added a new to-do: ${task}`);
    showToast("Task added to the list.");
});

function renderTodos() {
    const container = document.getElementById('todoList');
    if (!container) return;

    // Listen for todos in real-time
    onSnapshot(query(collections.todos, orderBy('timestamp', 'asc')), (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p class="subtext-center">The list is clear! What should we add? 📝</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const item = document.createElement('div');
            item.className = `todo-item list-item ${data.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <input type="checkbox" id="todo-${id}" ${data.completed ? 'checked' : ''} data-id="${id}">
                <label for="todo-${id}">
                    <span class="todo-title">${escapeHtml(data.task)}</span>
                    <span class="todo-user subtext">Added by: ${escapeHtml(data.user)}</span>
                </label>
                <button class="btn ghost small delete-todo-btn" data-id="${id}">🗑️</button>
            `;
            container.appendChild(item);
        });

        // Attach listeners for completion toggle
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const completed = e.target.checked;
                await updateDoc(doc(db, 'todos', id), { completed: completed });
                showToast(completed ? 'Task completed!' : 'Task reopened.', 'info');
                addToTimeline(completed ? 'Completed a to-do item' : 'Reopened a to-do item');
            });
        });
        
        // Attach listeners for delete
        container.querySelectorAll('.delete-todo-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                await deleteDoc(doc(db, 'todos', id));
                showToast('Task deleted.', 'info');
                addToTimeline('Deleted a to-do item');
            });
        });
    });
}

document.getElementById('addPollBtn')?.addEventListener('click', () => {
    const question = prompt("Enter the poll question:");
    if (!question) return;
    
    // Simple way to get options
    let options = prompt("Enter options, separated by commas (e.g., Movie, Restaurant, Stay In):");
    if (!options) return;
    
    // Create an object where each option is a key and the value is an empty array of voters
    const optionsObj = options.split(',').map(o => o.trim()).filter(o => o.length > 0)
        .reduce((acc, option) => ({ ...acc, [option]: [] }), {});

    if (Object.keys(optionsObj).length < 2) return showToast("Please provide at least two poll options.", 'error');

    addDoc(collections.polls, {
        user: USER_MAP[currentUser.email],
        question: question,
        options: optionsObj,
        timestamp: serverTimestamp()
    }).then(() => {
        showToast("Poll started!");
        addToTimeline(`Created a new poll: ${question}`);
    }).catch(e => {
        console.error("Error adding poll:", e);
        showToast("Failed to start poll.", 'error');
    });
});


function renderPolls() {
    const container = document.getElementById('pollsList');
    if (!container) return;

    onSnapshot(query(collections.polls, orderBy('timestamp', 'desc')), (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p class="subtext-center">No active polls. Start one now! 📊</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const totalVotes = Object.values(data.options).reduce((sum, voters) => sum + voters.length, 0);

            let pollHtml = '';
            Object.entries(data.options).forEach(([option, voters]) => {
                const count = voters.length;
                const percent = totalVotes === 0 ? 0 : (count / totalVotes) * 100;
                const userVoted = voters.includes(USER_MAP[currentUser.email]);
                
                pollHtml += `
                    <div class="poll-option ${userVoted ? 'voted' : ''}">
                        <div class="poll-bar-fill" style="width: ${percent}%;"></div>
                        <button class="btn ghost small vote-btn" data-id="${id}" data-option="${escapeHtml(option)}" ${userVoted ? 'disabled' : ''}>
                            ${userVoted ? 'VOTED' : 'Vote'}
                        </button>
                        <span class="poll-option-text">${escapeHtml(option)}</span>
                        <span class="vote-count">${count} (${percent.toFixed(0)}%)</span>
                    </div>
                `;
            });

            container.innerHTML += `
                <div class="card poll-item">
                    <h4>${escapeHtml(data.question)}</h4>
                    <p class="subtext">Started by ${escapeHtml(data.user)} - Total Votes: ${totalVotes}</p>
                    <div class="poll-options-list">${pollHtml}</div>
                </div>
            `;
        });

        // Attach vote listeners
        container.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', handleVote);
        });
    });
}

/**
 * Handles the logic for voting on a poll.
 * @param {Event} e
 */
async function handleVote(e) {
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
    Object.entries(currentOptions).forEach(([option, voters]) => {
        if (voters.includes(user)) {
            // User already voted for this option, so remove their vote (toggle)
            if (option === optionToVote) {
                updateFields[`options.${option}`] = arrayRemove(user);
                showToast(`Unvoted from "${option}".`, 'info');
                return;
            }
            // User voted for a different option, remove it
            updateFields[`options.${option}`] = arrayRemove(user);
        }
    });

    // Add the new vote, unless the user was unvoting their current choice
    const isTogglingOff = currentOptions[optionToVote]?.includes(user);
    if (!isTogglingOff) {
        updateFields[`options.${optionToVote}`] = arrayUnion(user);
        showToast(`Voted for "${optionToVote}"!`, 'success');
        addToTimeline(`Voted in a poll`);
    }

    try {
        if (Object.keys(updateFields).length > 0) {
            await updateDoc(pollRef, updateFields);
        }
    } catch (e) {
        console.error("Error handling vote:", e);
        showToast("Failed to cast vote.", 'error');
    }
}


/* ================= FAVORITES LOGIC ================= */

function renderFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    if (!favoritesGrid) return;
    
    // Function to fetch favorited media from a collection
    const fetchFavorites = async (collectionName) => {
        const q = query(
            collections[collectionName],
            orderBy('favoritedTimestamp', 'desc') // Use the specific timestamp for sorting
        );
        const snap = await getDocs(q);
        // Filter locally to find items favorited by *anyone* since favoritedTimestamp is for sorting
        return snap.docs.filter(docSnap => docSnap.data().favoritedBy?.length > 0).map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            type: collectionName === 'photos' ? 'image' : 'video'
        }));
    };

    Promise.all([
        fetchFavorites('photos'),
        fetchFavorites('videos')
    ]).then(([photoFavs, videoFavs]) => {
        // Merge and sort all favorites by the timestamp they were favorited
        const allFavs = [...photoFavs, ...videoFavs].sort((a, b) => b.favoritedTimestamp - a.favoritedTimestamp);

        favoritesGrid.innerHTML = '';
        if (allFavs.length === 0) {
            favoritesGrid.innerHTML = '<p class="subtext-center" style="grid-column: 1 / -1;">We haven\'t favorited enough media yet!</p>';
            return;
        }

        allFavs.forEach(data => {
            const div = document.createElement('div');
            div.className = 'masonry-item favorite-item';
            
            // Show a preview (image or video)
            const media = data.type === 'image' ?
                `<img src="${escapeHtml(data.url)}" loading="lazy" alt="favorite photo">` :
                `<video src="${escapeHtml(data.url)}" controls></video>`;

            const favoritedBy = data.favoritedBy.map(email => USER_MAP[email] || email.split('@')[0]);
            
            div.innerHTML = `
                ${media}
                <div class="item-meta">
                    <span style="font-weight: 500;">${data.type === 'image' ? 'Photo' : 'Video'}</span>
                    <span class="subtext">Fav'd by: ${favoritedBy.join(', ')}</span>
                </div>
            `;
            
            // Attach click handler for opening media
            div.querySelector(data.type === 'image' ? 'img' : 'video')?.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'video' && e.target.closest('.masonry-item video[controls]')) return;
                openLightbox(data.url, data.type);
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
    });
});

function renderCheckins() {
    document.getElementById('saveMoodBtn')?.addEventListener('click', async () => {
        if (!selectedMood || !currentUser) return showToast("Please select a mood.", 'error');
        
        const note = document.getElementById('moodNote').value.trim();
        
        try {
            await addDoc(collections.checkins, {
                user: USER_MAP[currentUser.email],
                mood: parseInt(selectedMood),
                note: note,
                timestamp: serverTimestamp()
            });
            showToast('Mood logged successfully!', 'success');
            addToTimeline(`Checked in with a mood of ${selectedMood}`);
            
            // Reset UI
            selectedMood = null;
            document.getElementById('moodNote').value = '';
            document.getElementById('saveMoodBtn').disabled = true;
            document.querySelectorAll('.mood-emoji').forEach(el => el.classList.remove('selected'));
            
            // Re-render chart after saving
            renderMoodChart();
        } catch (e) {
            showToast('Failed to log mood.', 'error');
            console.error("Error logging mood:", e);
        }
    });

    renderMoodChart();
}

/**
 * Fetches mood data and renders the Chart.js line graph.
 */
function renderMoodChart() {
    const canvas = document.getElementById('moodChartCanvas');
    if (!canvas) return;

    onSnapshot(query(collections.checkins, orderBy('timestamp', 'asc'), limit(30)), snap => {
        const data = snap.docs.map(doc => doc.data());
        const labels = data.map(d => d.timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'N/A');
        const moodData = data.map(d => d.mood);
        
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Our Mood',
                data: moodData,
                borderColor: 'var(--primary)',
                backgroundColor: 'rgba(195, 141, 158, 0.4)',
                tension: 0.3,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        };

        const config = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                // Map number to emoji for better visualization
                                const moodMap = { 1: '😩', 2: '😟', 3: '😐', 4: '😊', 5: '😍' };
                                return moodMap[value] || value;
                            }
                        },
                        grid: {
                            color: 'var(--line-color)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'var(--line-color)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
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
