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
    const loginBtn = document.getElementById('loginButton');
    const profileBtn = document.getElementById('profileButton');
    const switchUserBtn = document.getElementById('switchUserButton');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const mainContainer = document.getElementById('mainAppContainer'); // Added

    if (user) {
        // User is signed in
        currentUser = user;
        
        // Set display name and email
        const displayName = USER_MAP[user.email] || 'Unknown User';
        if(profileName) profileName.textContent = displayName;
        if(profileEmail) profileEmail.textContent = user.email;

        // Show profile/logout elements, hide login button
        if(loginBtn) loginBtn.style.display = 'none';
        if(profileBtn) profileBtn.style.display = 'flex';
        if(switchUserBtn) switchUserBtn.style.display = 'none';
        if(mainContainer) mainContainer.style.display = 'block'; // Show app content

    } else {
        // User is signed out (user is null)
        currentUser = null;
        if(profileName) profileName.textContent = 'Guest';
        if(profileEmail) profileEmail.textContent = '';

        // Hide profile/logout elements, show login button
        if(loginBtn) loginBtn.style.display = 'block';
        if(profileBtn) profileBtn.style.display = 'none';
        if(switchUserBtn) switchUserBtn.style.display = 'none';
        
        // Reset the app view
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
    return !str ? '' : String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' })[m]);
}

/* ================= LOGIN & AUTH (FIXED) ================= */

/**
 * Handles profile selection in the login modal.
 * This function also sets the necessary classes for the button styling.
 * @param {string} user - 'brayden' or 'youna'.
 */
function selectProfile(user) {
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
    
    // Enable the password input and focus it
    if (authPasswordInput) authPasswordInput.disabled = false;
    authPasswordInput?.focus();
    
    checkFormValidity();
}

/**
 * Checks if the sign-in button should be enabled.
 */
function checkFormValidity() {
    const passwordValid = authPasswordInput?.value?.length > 0;
    const profileSelected = selectedUser !== null;
    
    if (passwordValid && profileSelected) {
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
    if (!selectedUser || signInBtn.disabled) return;
    
    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    try {
        if (signInBtn) signInBtn.textContent = 'Signing In...';
        if (signInBtn) signInBtn.disabled = true;

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        currentUserProfile = USER_CREDENTIALS[selectedUser];
        currentUser = userCredential.user;
        showToast(`Welcome back, ${currentUserProfile.displayName}!`, 'success');

        hideLogin();
        // onAuthStateChanged will handle initApp()

        // Re-enable button on success state (though it will be hidden by hideLogin)
        if (signInBtn) signInBtn.textContent = 'Sign In';
        
    } catch (error) {
        console.error('Sign In Error:', error.message);
        showToast('Login failed. Please check your password.', 'error');
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
    let braydenCount = 0;
    let younaCount = 0;
    (await getDocs(collections.timeline)).forEach(doc => {
        const user = doc.data().user;
        if (user === 'Brayden' && doc.data().action.startsWith('Uploaded')) braydenCount++;
        if (user === 'Youna' && doc.data().action.startsWith('Uploaded')) younaCount++;
    });

    statsContent.innerHTML = `
        <div class="stat-item"><h4>${totalItems}</h4><p>Total Items</p></div>
        <div class="stat-item"><h4>${braydenCount} / ${younaCount}</h4><p>Media Uploads (B/Y)</p></div>
        <div class="stat-item"><h4>${lastActivity}</h4><p>Last Activity By</p></div>
    `;
}

function renderMilestones() {
    const container = document.getElementById('milestonesContent');
    if(!container) return;

    // Mock Milestones for demonstration
    const milestones = [
        { title: "First Anniversary!", date: "2025-05-09", reached: new Date() > new Date("2025-05-09") },
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
                    <div>${escapeHtml(data.action)}</div>
                    <span style="font-size:0.8rem; color:var(--subtext);">${date} • ${escapeHtml(data.user)}</span>
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


/* ================= MEDIA ENHANCEMENTS (Tagging/Comments/Reactions) ================= */

const openMediaModal = async (docId, collectionName) => {
    const modal = document.getElementById('mediaModal');
    const content = document.getElementById('mediaModalContent');
    if(!modal || !content || !currentUser) return;
    
    // Fetch fresh data
    const mediaSnap = await getDoc(doc(db, collectionName, docId));
    if (!mediaSnap.exists()) return showToast('Media not found.', 'error');
    const data = mediaSnap.data();

    document.getElementById('mediaModalTitle').textContent = `${collectionName.slice(0,-1)} Options`;

    let mediaEmbed = '';
    if(collectionName === 'photos') {
        mediaEmbed = `<img src="${data.url}" style="width:100%; max-height: 250px; object-fit: contain; border-radius: 8px;">`;
    } else {
        mediaEmbed = `<video src="${data.url}" controls style="width:100%; max-height: 250px; border-radius: 8px;"></video>`;
    }
    
    // Tagging Input
    const tagInputHtml = `
        <div style="margin: 15px 0;">
            <h4 style="margin-bottom: 8px;">Tags/People</h4>
            <div id="tagList" class="media-tag-list">${(data.tags || []).map(t => `<span class="media-tag">${t}</span>`).join('')}</div>
            <div class="media-tags-input">
                <input type="text" id="newTagInput" placeholder="Add tag (e.g. Hawaii, Brayden)" class="glass-input" style="margin-bottom:0;">
                <button id="addTagBtn" class="btn primary small">Add</button>
            </div>
        </div>
    `;

    // Comment Input
    const commentsListHtml = (data.comments || []).sort((a, b) => b.timestamp - a.timestamp).map(c => `
        <div class="comment-item">
            <strong>${escapeHtml(c.user)}:</strong> ${escapeHtml(c.content)}
        </div>
    `).join('');
    
    const commentsInputHtml = `
        <div class="media-comments">
            <h4 style="margin-bottom: 8px;">Comments (${(data.comments || []).length})</h4>
            <div id="commentsList" style="max-height: 150px; overflow-y: auto; margin-bottom: 10px;">${commentsListHtml}</div>
            <input type="text" id="newCommentInput" placeholder="Add a comment..." class="glass-input" style="margin-bottom:8px;">
            <button id="addCommentBtn" class="btn primary small full-width">Post Comment</button>
        </div>
    `;

    // Reaction Pills (Simplistic implementation)
    const reactions = data.reactions || {};
    const reactionEmojis = ['❤️', '😂', '😮', '👍', '🔥'];
    const reactionsHtml = `
        <h4 style="margin-bottom: 8px; margin-top: 15px;">Reactions</h4>
        <div class="reaction-pills">
            ${reactionEmojis.map(emoji => {
                const count = (reactions[emoji] || []).length;
                const userVoted = (reactions[emoji] || []).includes(USER_MAP[currentUser.email]);
                return `<span class="reaction-pill ${userVoted ? 'user-reacted' : ''}" data-emoji="${emoji}">${emoji} ${count > 0 ? count : ''}</span>`;
            }).join('')}
        </div>
    `;

    content.innerHTML = mediaEmbed + tagInputHtml + reactionsHtml + commentsInputHtml;
    modal.classList.add('active');
    
    // Add Tag Listener
    document.getElementById('addTagBtn').onclick = async () => {
        const tag = document.getElementById('newTagInput').value.trim();
        if(!tag) return;
        await updateDoc(doc(db, collectionName, docId), { tags: arrayUnion(tag) });
        document.getElementById('newTagInput').value = '';
        openMediaModal(docId, collectionName); // Re-render modal with updated data
        showToast(`Added tag: ${tag}`);
    };

    // Add Reaction Listener (Delegated)
    document.querySelectorAll('.reaction-pill').forEach(pill => {
        pill.onclick = async () => {
            const emoji = pill.dataset.emoji;
            const user = USER_MAP[currentUser.email];
            const currentData = (await getDoc(doc(db, collectionName, docId))).data();
            const currentReactions = currentData.reactions || {};
            
            if ((currentReactions[emoji] || []).includes(user)) {
                await updateDoc(doc(db, collectionName, docId), {
                    [`reactions.${emoji}`]: arrayRemove(user)
                });
            } else {
                await updateDoc(doc(db, collectionName, docId), {
                    [`reactions.${emoji}`]: arrayUnion(user)
                });
            }
            openMediaModal(docId, collectionName); // Re-render modal with updated data
        };
    });

    // Add Comment Listener
    document.getElementById('addCommentBtn').onclick = async () => {
        const comment = document.getElementById('newCommentInput').value.trim();
        if(!comment) return;
        await updateDoc(doc(db, collectionName, docId), {
            comments: arrayUnion({ content: comment, user: USER_MAP[currentUser.email], timestamp: Date.now() })
        });
        document.getElementById('newCommentInput').value = '';
        openMediaModal(docId, collectionName); // Re-render modal with updated data
        addToTimeline(`Commented on a ${collectionName.slice(0,-1)}`);
    };
};

document.getElementById('closeMediaModalBtn')?.addEventListener('click', () => document.getElementById('mediaModal').classList.remove('active'));

function renderGallery(type) {
    const container = document.getElementById(type === 'photos' ? 'photoGallery' : 'videoGallery');
    onSnapshot(query(collections[type], orderBy('timestamp', 'desc')), snap => {
        if(!container) return;
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'masonry-item';
            const media = type === 'photos'
                ? `<img src="${escapeHtml(data.url)}" loading="lazy" data-url="${escapeHtml(data.url)}" alt="photo">`
                : `<video src="${escapeHtml(data.url)}" controls></video>`;
            
            // Render Reactions summary
            const reactions = data.reactions || {};
            const reactionsSummary = Object.entries(reactions)
                .filter(([, users]) => users.length > 0)
                .map(([emoji, users]) => `${emoji}${users.length}`)
                .join(' ');

            div.innerHTML = `
                ${media}
                <div class="item-meta">
                    <span>${escapeHtml(data.user)}</span>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span style="font-size:0.8rem; color:var(--primary);">${reactionsSummary}</span>
                        <button class="btn small ghost options-btn">Options</button>
                    </div>
                </div>
            `;
            
            div.querySelector('.options-btn').onclick = () => openMediaModal(id, type);
            
            if(type === 'photos') {
                const img = div.querySelector('img');
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', () => {
                    openLightbox({ type: 'image', src: img.dataset.url, caption: `${escapeHtml(data.user)}` });
                });
            }
            container.appendChild(div);
        });
    });
}


/* ================= NOTES & VOICE (THREADED) ================= */

// Pin Note Logic
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
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Just now';
            const pinnedIcon = data.pinned ? '📌 ' : '';
            
            // Build Replies
            const sortedReplies = (data.replies || []).sort((a, b) => a.timestamp - b.timestamp);
            
            const repliesHtml = sortedReplies.map(reply => {
                const replyDate = new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="note-reply">
                        <strong>${escapeHtml(reply.user)}</strong> (${replyDate}): ${escapeHtml(reply.content)}
                    </div>
                `;
            }).join('');

            const div = document.createElement('div');
            div.className = 'card note-item thread-parent';
            div.innerHTML = `
                <div class="note-meta">
                    <span class="note-date">${pinnedIcon}${escapeHtml(date)} • ${escapeHtml(data.user)}</span>
                    <button class="btn ghost small delete-note-trigger" data-id="${id}" aria-label="Options">... </button>
                </div>
                <p class="note-content">${escapeHtml(data.content)}</p>
                <a href="#" class="reply-link" data-id="${id}">Reply (${(data.replies || []).length})</a>
                <div class="note-replies">
                    ${repliesHtml}
                </div>
            `;
            
            // Reply Link Handler
            div.querySelector('.reply-link').onclick = (e) => {
                e.preventDefault();
                document.getElementById('noteInput').dataset.parentId = id;
                document.getElementById('noteInput').placeholder = `Replying to ${data.user}'s note...`;
                document.getElementById('noteInput').focus();
            };

            // Needs delete functionality (using a mock options button for now)
            div.querySelector('.delete-note-trigger').onclick = async () => {
                if(confirm('Are you sure you want to delete this note?')) {
                    try {
                        await deleteDoc(doc(db, 'notes', id));
                        showToast('Note deleted.', 'success');
                        addToTimeline('Deleted a note');
                    } catch(e) {
                        showToast('Failed to delete note.', 'error');
                        console.error("Error deleting note:", e);
                    }
                }
            };

            list.appendChild(div);
        });
    });
}

// --- Voice Recording Logic ---
document.getElementById('recordAudioBtn')?.addEventListener('click', toggleRecording);
document.getElementById('cancelRecordingBtn')?.addEventListener('click', stopRecording);
document.getElementById('uploadRecordingBtn')?.addEventListener('click', uploadRecording);

function toggleRecording() {
    // Simplified stub
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        const recordBtn = document.getElementById('recordAudioBtn');
        const uploadBtn = document.getElementById('uploadRecordingBtn');
        const cancelBtn = document.getElementById('cancelRecordingBtn');

        if(recordBtn) recordBtn.textContent = '🎤 Re-record';
        if(uploadBtn) uploadBtn.style.display = 'inline-block';
        if(cancelBtn) cancelBtn.style.display = 'inline-block';
        showToast('Recording stopped. Ready to upload.');
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
            const recordBtn = document.getElementById('recordAudioBtn');
            const uploadBtn = document.getElementById('uploadRecordingBtn');
            const cancelBtn = document.getElementById('cancelRecordingBtn');

            if(recordBtn) recordBtn.textContent = '🛑 Stop Recording';
            if(uploadBtn) uploadBtn.style.display = 'none';
            if(cancelBtn) cancelBtn.style.display = 'none';
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
    }
    // Reset UI state after stop (manual cancel or recording end)
    const recordBtn = document.getElementById('recordAudioBtn');
    const uploadBtn = document.getElementById('uploadRecordingBtn');
    const cancelBtn = document.getElementById('cancelRecordingBtn');
    
    if(recordBtn) recordBtn.textContent = '🎙️ Record Voice Note';
    if(uploadBtn) uploadBtn.style.display = 'none';
    if(cancelBtn) cancelBtn.style.display = 'none';
    audioChunks = []; // Discard chunks
    showToast('Recording cancelled.', 'info');
}

async function uploadRecording() {
    if (audioChunks.length === 0 || !currentUser) return showToast('No audio recorded.', 'error');

    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const storagePath = `voice-notes/${Date.now()}.webm`;
    const storageRefInstance = storageRef(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRefInstance, audioBlob);

    const uploadBtn = document.getElementById('uploadRecordingBtn');
    const recordBtn = document.getElementById('recordAudioBtn');
    const cancelBtn = document.getElementById('cancelRecordingBtn');

    if(uploadBtn) {
        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;
    }

    uploadTask.on('state_changed',
        (snapshot) => {
            // Observe state change events such as progress, pause, and resume
        },
        (error) => {
            console.error("Upload error:", error);
            showToast('Voice note upload failed.', 'error');
            if(uploadBtn) {
                uploadBtn.textContent = 'Upload Failed';
                uploadBtn.disabled = false;
            }
        },
        async () => {
            // Handle successful uploads on complete
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            await addDoc(collections.music, { // Storing voice notes in 'music' collection
                url: downloadURL,
                type: 'voice',
                user: USER_MAP[currentUser.email],
                timestamp: serverTimestamp()
            });
            
            showToast('Voice note uploaded successfully!', 'success');
            addToTimeline('Uploaded a voice note');
            if(recordBtn) recordBtn.textContent = '🎙️ Record Voice Note';
            if(uploadBtn) uploadBtn.style.display = 'none';
            if(cancelBtn) cancelBtn.style.display = 'none';
            if(uploadBtn) uploadBtn.disabled = false;
        }
    );
}

function renderMusic() {
    const list = document.getElementById('musicList');
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
                mediaElement = `<audio controls src="${escapeHtml(data.url)}"></audio>`;
            } else {
                mediaElement = `<iframe src="${escapeHtml(data.url)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:12px; height: 80px; width:100%;" frameborder="0" allowfullscreen="" title="Music"></iframe>`;
            }

            div.innerHTML = `
                ${mediaElement}
                <div style="font-size:0.85rem; color:var(--subtext);">
                    ${data.type === 'voice' ? 'Voice Note' : 'Shared Music'} • ${escapeHtml(data.user)} on ${date}
                </div>
            `;
            list.appendChild(div);
        });
    });
}


/* ================= MAP LOGIC (STUBS) ================= */

// Fix: These functions were called but not defined, causing the app to crash on login.
function initMap() {
    // Check if map is already initialized
    if (mapInstance) {
        mapInstance.invalidateSize();
        return;
    }
    
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Initialize Leaflet Map
    mapInstance = L.map('map').setView([39.8283, -98.5795], 4); // Centered on the US

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    // Call render functions after map is ready
    renderMemoryLocations();
    // renderMediaLocations is called by the tab switch logic if needed
}

function renderMemoryLocations() {
    // Simplified function to plot memories
    // (You would fetch these from your 'memories' collection)
    if (!mapInstance) return;

    memoryMarkers.forEach(marker => mapInstance.removeLayer(marker));
    memoryMarkers = [];

    const mockMemories = [
        { title: "First Date", lat: 40.7128, lng: -74.0060, desc: "Dinner in NYC!" },
        { title: "West Coast Trip", lat: 34.0522, lng: -118.2437, desc: "Hiking in LA." },
    ];

    mockMemories.forEach(memory => {
        const marker = L.marker([memory.lat, memory.lng]).addTo(mapInstance)
            .bindPopup(`<b>${escapeHtml(memory.title)}</b><br>${escapeHtml(memory.desc)}`);
        memoryMarkers.push(marker);
    });
}

function renderMediaLocations() {
    // Stub for showing media on map - depends on the mediaVisible flag
}

/* ================= UTILITY LOGIC (STUBS) ================= */

function openLightbox(media) {
    const lightbox = document.getElementById('lightbox');
    const container = document.querySelector('.lightbox-media-container');
    const caption = document.querySelector('.lightbox-caption');
    
    if(!lightbox || !container || !caption) return;
    
    container.innerHTML = '';
    
    if (media.type === 'image') {
        container.innerHTML = `<img src="${media.src}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">`;
    } else if (media.type === 'video') {
        container.innerHTML = `<video src="${media.src}" controls style="max-width: 100%; max-height: 80vh;"></video>`;
    }
    
    caption.textContent = media.caption;
    lightbox.classList.add('active');
}

function closeLightbox() {
    document.getElementById('lightbox')?.classList.remove('active');
    document.querySelector('.lightbox-media-container').innerHTML = '';
}

// Ensure the close button is wired up (check if it's already done in the provided HTML)
document.querySelector('#lightbox .close-lightbox')?.addEventListener('click', closeLightbox);


/* ================= OTHER SECTION LOGIC (STUBS) ================= */

// Fix: These functions were called but not defined, causing the app to crash on navigation.
/* ================= CALENDAR & EVENTS LOGIC ================= */

/**
 * Renders a list of upcoming events and handles the add event modal.
 */
function renderCalendar() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;

    // Listen for events in real-time
    onSnapshot(query(collections.events, orderBy('timestamp', 'asc')), (snapshot) => {
        container.innerHTML = '<h3>Upcoming Events</h3>';
        
        if (snapshot.empty) {
            container.innerHTML += '<p class="subtext-center">No events planned yet. Tap the button to add one! 🎉</p>';
            return;
        }

        let currentMonth = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            const month = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            if (month !== currentMonth) {
                container.innerHTML += `<h4 class="month-header">${month}</h4>`;
                currentMonth = month;
            }

            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            container.innerHTML += `
                <div class="event-item" data-id="${docSnap.id}">
                    <div class="event-date">${date.getDate()}</div>
                    <div class="event-details">
                        <strong>${escapeHtml(data.title)}</strong>
                        <span class="subtext">${time} • ${escapeHtml(data.location)}</span>
                    </div>
                    <button class="btn ghost small delete-event-btn" data-id="${docSnap.id}">❌</button>
                </div>
            `;
        });

        // Attach delete listeners
        container.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this event?')) {
                    await deleteDoc(doc(db, 'events', id));
                    showToast('Event deleted!', 'success');
                    addToTimeline('Deleted an event');
                }
            });
        });
    });
}

// Event Listeners for adding an event (assumes a modal exists in index.html)
document.getElementById('addEventBtn')?.addEventListener('click', () => {
    document.getElementById('addEventModal')?.classList.add('active');
});

document.getElementById('cancelEventBtn')?.addEventListener('click', () => {
    document.getElementById('addEventModal')?.classList.remove('active');
});

document.getElementById('saveEventBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('eventTitleInput').value.trim();
    const location = document.getElementById('eventLocationInput').value.trim();
    const dateStr = document.getElementById('eventDateInput').value;
    
    if (!title || !dateStr || !currentUser) return showToast('Please fill in event title and date.', 'error');

    try {
        await addDoc(collections.events, {
            title: title,
            location: location,
            timestamp: new Date(dateStr),
            user: USER_MAP[currentUser.email]
        });
        showToast('Event saved successfully!', 'success');
        addToTimeline(`Added new event: ${title}`);
        document.getElementById('addEventModal')?.classList.remove('active');
        document.getElementById('eventTitleInput').value = '';
        document.getElementById('eventLocationInput').value = '';
        document.getElementById('eventDateInput').value = '';
    } catch (e) {
        showToast('Failed to save event.', 'error');
        console.error("Error saving event:", e);
    }
    /* ================= TO-DOS LOGIC ================= */

    /**
     * Renders the interactive to-do list.
     */
    function renderTodos() {
        const container = document.getElementById('todosContainer');
        const input = document.getElementById('todoInput');
        const addButton = document.getElementById('addTodoBtn');

        if (!container) return;

        // Listener for real-time updates
        onSnapshot(query(collections.todos, orderBy('timestamp', 'desc')), (snapshot) => {
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="subtext-center">The list is clear! What should we add? 📝</p>';
                return;
            }

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const id = docSnap.id;
                const item = document.createElement('div');
                item.className = `todo-item ${data.completed ? 'completed' : ''}`;
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
                    addToTimeline(completed ? 'Completed a todo item' : 'Reopened a todo item');
                });
            });

            // Attach listeners for deletion
            container.querySelectorAll('.delete-todo-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await deleteDoc(doc(db, 'todos', id));
                    showToast('To-do item deleted.', 'success');
                    addToTimeline('Deleted a todo item');
                });
            });
        });

        // Add To-Do item button listener
        addButton?.addEventListener('click', async () => {
            const task = input.value.trim();
            if (!task || !currentUser) return;

            await addDoc(collections.todos, {
                task: task,
                completed: false,
                user: USER_MAP[currentUser.email],
                timestamp: serverTimestamp()
            });
            input.value = '';
            showToast('To-do item added!', 'success');
            addToTimeline(`Added new todo: ${task}`);
        });
        /* ================= POLLS LOGIC ================= */

        /**
         * Renders active polls, showing results and allowing the current user to vote.
         */
        function renderPolls() {
            const container = document.getElementById('pollsContainer');
            if (!container) return;

            onSnapshot(query(collections.polls, orderBy('timestamp', 'desc')), (snapshot) => {
                container.innerHTML = '<h3>Shared Decisions (Polls)</h3>';

                if (snapshot.empty) {
                    container.innerHTML += '<p class="subtext-center">No active polls. Start one!</p>';
                    return;
                }

                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const id = docSnap.id;
                    const options = data.options || {};
                    const pollUser = USER_MAP[currentUser?.email];

                    let totalVotes = 0;
                    Object.values(options).forEach(voters => totalVotes += (voters.length || 0));

                    const pollHtml = Object.entries(options).map(([option, voters]) => {
                        const count = voters.length;
                        const percent = totalVotes === 0 ? 0 : (count / totalVotes) * 100;
                        const hasVoted = voters.includes(pollUser);
                        const buttonClass = hasVoted ? 'primary' : 'secondary ghost';

                        return `
                            <div class="poll-option" data-option="${escapeHtml(option)}" data-id="${id}">
                                <button class="btn small vote-btn ${buttonClass}" data-option="${escapeHtml(option)}" data-id="${id}" ${!pollUser ? 'disabled' : ''}>
                                    ${hasVoted ? 'Voted' : 'Vote'}
                                </button>
                                <div class="poll-bar-container">
                                    <div class="poll-bar" style="width: ${percent.toFixed(0)}%;"></div>
                                    <span class="poll-option-text">${escapeHtml(option)}</span>
                                </div>
                                <span class="vote-count">${count} (${percent.toFixed(0)}%)</span>
                            </div>
                        `;
                    }).join('');

                    container.innerHTML += `
                        <div class="card poll-item">
                            <h4>${escapeHtml(data.question)}</h4>
                            <p class="subtext">Started by ${escapeHtml(data.user)}</p>
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
                    } else {
                        // User voted for a different option, remove old vote
                        updateFields[`options.${option}`] = arrayRemove(user);
                    }
                }
            });

            // Add new vote if it wasn't a toggle off the same option
            if (!currentOptions[optionToVote]?.includes(user)) {
                updateFields[`options.${optionToVote}`] = arrayUnion(user);
                showToast(`Voted for: ${optionToVote}`, 'success');
            } else if (updateFields[`options.${optionToVote}`] === arrayRemove(user)) {
                showToast('Vote removed.', 'info');
            }

            try {
                await updateDoc(pollRef, updateFields);
                addToTimeline(`Voted in a poll`);
            } catch (e) {
                showToast('Failed to save vote.', 'error');
                console.error("Error voting:", e);
            }
            /* ================= FAVORITES LOGIC ================= */

            /**
             * Renders a combined gallery of all favorited items (photos and videos).
             */
            function renderFavorites() {
                const container = document.getElementById('favoritesContainer');
                if (!container) return;

                container.innerHTML = '<h3>Our Favorite Memories ❤️</h3><div class="masonry-grid" id="favoritesGrid"></div>';
                const favoritesGrid = document.getElementById('favoritesGrid');

                // Fetch favorited items (simplified: assuming 'favorites' collection stores media IDs and types)
                // NOTE: For a real app, you'd typically fetch all media and filter by a 'isFavorite' field or a 'favorites' subcollection on the media item.
                // For simplicity, we will mock/hard-code the collection names to check.

                const fetchFavorites = async (collectionName) => {
                    const snapshot = await getDocs(collections[collectionName]);
                    return snapshot.docs.filter(docSnap => {
                        // Simple mock: assume an item is a favorite if it has more than 2 reactions.
                        const reactions = docSnap.data().reactions || {};
                        const totalReactionCount = Object.values(reactions).reduce((sum, users) => sum + users.length, 0);
                        return totalReactionCount > 2; // Arbitrary favorite logic
                    }).map(docSnap => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                        type: collectionName === 'photos' ? 'image' : 'video'
                    }));
                };

                Promise.all([
                    fetchFavorites('photos'),
                    fetchFavorites('videos')
                ]).then(([photoFavs, videoFavs]) => {
                    const allFavs = [...photoFavs, ...videoFavs].sort((a, b) => b.timestamp - a.timestamp); // Sort by recency
                    
                    favoritesGrid.innerHTML = '';
                    if (allFavs.length === 0) {
                        favoritesGrid.innerHTML = '<p class="subtext-center" style="grid-column: 1 / -1;">We haven\'t favorited enough media yet!</p>';
                        return;
                    }

                    allFavs.forEach(data => {
                        const div = document.createElement('div');
                        div.className = 'masonry-item favorite-item';
                        
                        const media = data.type === 'image'
                            ? `<img src="${escapeHtml(data.url)}" loading="lazy" alt="favorite photo">`
                            : `<video src="${escapeHtml(data.url)}" controls></video>`;
                        
                        div.innerHTML = `
                            ${media}
                            <div class="item-meta">
                                <span style="font-weight: 500;">${data.type === 'image' ? 'Photo' : 'Video'}</span>
                                <span class="subtext">${escapeHtml(data.user)}</span>
                            </div>
                        `;
                        // Add click handler to open full media/lightbox if desired
                        if (data.type === 'image') {
                             div.querySelector('img').addEventListener('click', () => {
                                openLightbox({ type: 'image', src: data.url, caption: `${escapeHtml(data.user)}'s favorite` });
                            });
                        }
                        
                        favoritesGrid.appendChild(div);
                    });
                }).catch(e => {
                    console.error("Error rendering favorites:", e);
                    favoritesGrid.innerHTML = '<p class="subtext-center" style="grid-column: 1 / -1; color: var(--error);">Failed to load favorites.</p>';
                });
            }
            /* ================= CHECKINS & MOOD LOGIC ================= */

            const MOOD_EMOJIS = ['😄', '😊', '😐', '😟', '😭'];
            const MOOD_VALUES = { '😄': 5, '😊': 4, '😐': 3, '😟': 2, '😭': 1 };
            let currentMoodSelection = null;

            /**
             * Handles the display of the check-in section, including the mood chart.
             */
            function renderCheckins() {
                const container = document.getElementById('checkinsContainer');
                if (!container) return;
                
                // Ensure the structure is rendered (this should be in index.html, but we ensure it for function clarity)
                container.innerHTML = `
                    <div class="card checkin-log-card">
                        <h4>How are you feeling today?</h4>
                        <div id="moodSelector" class="mood-selector">
                            ${MOOD_EMOJIS.map(emoji => `<span class="mood-emoji" data-mood="${emoji}">${emoji}</span>`).join('')}
                        </div>
                        <textarea id="moodNote" placeholder="Optional: Add a note about your day..." class="glass-input"></textarea>
                        <button id="saveMoodBtn" class="btn primary full-width" disabled>Log Mood</button>
                    </div>
                    
                    <div class="card checkin-chart-card">
                        <h4>Mood Trend (Last 7 Days)</h4>
                        <canvas id="moodChartCanvas"></canvas>
                    </div>
                `;

                // Mood Selector Logic
                document.querySelectorAll('.mood-emoji').forEach(emojiEl => {
                    emojiEl.addEventListener('click', (e) => {
                        document.querySelectorAll('.mood-emoji').forEach(el => el.classList.remove('selected'));
                        e.target.classList.add('selected');
                        currentMoodSelection = e.target.dataset.mood;
                        document.getElementById('saveMoodBtn').disabled = false;
                    });
                });

                // Save Mood Button Listener
                document.getElementById('saveMoodBtn')?.addEventListener('click', async () => {
                    if (!currentMoodSelection || !currentUser) return;
                    const note = document.getElementById('moodNote').value.trim();
                    
                    try {
                        await addDoc(collections.checkins, {
                            mood: currentMoodSelection,
                            value: MOOD_VALUES[currentMoodSelection],
                            note: note,
                            user: USER_MAP[currentUser.email],
                            timestamp: serverTimestamp()
                        });
                        showToast(`Mood logged: ${currentMoodSelection}`, 'success');
                        addToTimeline('Logged a mood check-in');
                        
                        // Reset UI
                        currentMoodSelection = null;
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

                onSnapshot(query(collections.checkins, orderBy('timestamp', 'desc'), limit(7)), (snapshot) => {
                    // Prepare data for chart (order is important: oldest first)
                    const rawData = [];
                    snapshot.forEach(docSnap => rawData.push(docSnap.data()));
                    const chartData = rawData.reverse(); // Now oldest is first

                    const labels = chartData.map(d => d.timestamp?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' }) || 'Today');
                    const dataValues = chartData.map(d => d.value);

                    const data = {
                        labels: labels,
                        datasets: [{
                            label: 'Overall Mood Trend',
                            data: dataValues,
                            borderColor: '#C38D9E',
                            backgroundColor: 'rgba(195, 141, 158, 0.2)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 6,
                            pointHoverRadius: 8
                        }]
                    };

                    const config = {
                        type: 'line',
                        data: data,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    min: 1,
                                    max: 5,
                                    ticks: {
                                        callback: function(value) {
                                            return Object.keys(MOOD_VALUES).find(key => MOOD_VALUES[key] === value);
                                        }
                                    },
                                    grid: { display: false }
                                },
                                x: {
                                    grid: { drawOnChartArea: false }
                                }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return ` Mood: ${context.label} - ${context.raw}`;
                                        }
                                    }
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
    document.getElementById('mainAppContainer').style.display = 'block';
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
    document.querySelector('.tab-btn[data-section="dashboard"]')?.click();
}


/* ================= INITIALIZATION & THEME ================= */
document.getElementById('darkModeToggle')?.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
});

// Close lightbox shortcut shortcut
document.querySelectorAll('.close-lightbox').forEach(el => el.addEventListener('click', closeLightbox));
