// script.js - Optimized, Functional, and Amazing (MERGED + COMPLETE)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, getDocs, limit, getDoc, where
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
// UPDATED: Added createUserWithEmailAndPassword and updateProfile for sign-up
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { Chart } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js";
import L from "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "brayden-youna-app.firebaseapp.com",
  projectId: "brayden-youna-app",
  storageBucket: "brayden-youna-app.appspot.com",
  messagingSenderId: "...",
  appId: "...",
  databaseURL: "https://brayden-youna-app-default-rtdb.firebaseio.com",
  measurementId: "..."
};

// --- Initialization (REQUIRED) ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

// --- Global App State (REQUIRED) ---
let currentUser = null;
let mapInstance = null;
let moodChart = null;

// --- Mock Data / Constants (REQUIRED) ---
const DEBUT_DATE = new Date('2023-11-20T17:00:00'); // Our date!
const USERS = {
  'brayden': 'brayden@love.com',
  'youna': 'youna@love.com'
};
const USER_MAP = {
    'brayden@love.com': 'Brayden',
    'youna@love.com': 'Youna'
};
// REMOVED: USER_CREDENTIALS object

// --- Authentication State (UPDATED) ---
let selectedUser = null;
let currentUserProfile = null;
let isSignUpState = false; // Tracks the state of the auth modal

// --- DOM Elements for Login (UPDATED) ---
const authModal = document.getElementById('authModal');
const braydenLoginBtn = document.getElementById('braydenLogin');
const younaLoginBtn = document.getElementById('younaLogin');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
// Updated/New DOM elements
const authPrimaryBtn = document.getElementById('authPrimaryBtn');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authDisplayNameInput = document.getElementById('authDisplayName');
const authSwitchLink = document.getElementById('authSwitchLink');
const logoutBtn = document.getElementById('logoutBtn');


/* ================= TOASTS & UTILS ================= */

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'n/a';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function truncateText(text, limit) {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
}


/* ================= UI DISPLAY & NAVIGATION ================= */

function showLogin() {
    authModal?.classList.add('active');
    document.getElementById('mainAppContainer').style.display = 'none';
}

function hideLogin() {
    authModal?.classList.remove('active');
    document.getElementById('mainAppContainer').style.display = 'block';
}

function updateUserDisplay(user) {
    const userDisplay = document.getElementById('currentUserDisplay');
    const settingsUserEmail = document.getElementById('settingsUserEmail');

    if (user && currentUserProfile) {
        if(userDisplay) userDisplay.textContent = `Hello, ${currentUserProfile.displayName}!`;
        if(settingsUserEmail) settingsUserEmail.textContent = currentUserProfile.email;
    } else {
        if(userDisplay) userDisplay.textContent = 'Welcome.';
        if(settingsUserEmail) settingsUserEmail.textContent = 'Not Signed In';
    }
}

// Tab navigation logic
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        const target = button.getAttribute('data-section');
        
        // Update tab button styles
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update content section visibility
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
            if (section.id === target) {
                section.style.display = 'block';
                // Special handling for map to ensure re-render
                if (target === 'map' && mapInstance) {
                    mapInstance.invalidateSize();
                }
            }
        });
    });
});

/* ================= LOGIN & AUTH (UPDATED) ================= */

// Helper to derive a profile from an email. Falls back to email prefix for new users.
function getProfileFromEmail(email) {
    const userKey = Object.keys(USERS).find(key => USERS[key] === email);
    if (userKey) {
        // Brayden/Youna (existing users)
        return { displayName: USER_MAP[email], email: email };
    }
    // New or unexpected user - use email prefix as a fallback display name
    return { displayName: email.split('@')[0], email: email };
}


function selectProfile(user) {
    if (isSignUpState) return; // Prevent selection in sign-up state
    
    console.log(`Profile selected: ${user}`);
    selectedUser = user;
    if (authEmailInput) authEmailInput.value = USERS[user];
    
    braydenLoginBtn?.classList.remove('active', 'primary', 'ghost');
    younaLoginBtn?.classList.remove('active', 'primary', 'ghost');

    const selectedBtn = document.getElementById(`${user}Login`);
    const otherBtn = document.getElementById(`${user === 'brayden' ? 'youna' : 'brayden'}Login`);

    selectedBtn?.classList.add('active', 'primary');
    otherBtn?.classList.add('ghost');
    
    if (authPasswordInput) authPasswordInput.value = '';
    if (authPasswordInput) authPasswordInput.disabled = false;
    authPasswordInput?.focus();
    
    checkFormValidity();
}

function checkFormValidity() {
    // Firebase min password length is 6
    const passwordValid = authPasswordInput?.value?.length >= 6;
    const emailValid = authEmailInput?.value?.length > 0;
    // Require display name only in sign-up mode
    const displayNameValid = isSignUpState ? authDisplayNameInput?.value?.length > 0 : true;

    if (passwordValid && emailValid && displayNameValid) {
        authPrimaryBtn?.classList.remove('ghost');
        authPrimaryBtn?.classList.add('primary');
        if(authPrimaryBtn) authPrimaryBtn.disabled = false;
    } else {
        authPrimaryBtn?.classList.remove('primary');
        authPrimaryBtn?.classList.add('ghost');
        if(authPrimaryBtn) authPrimaryBtn.disabled = true;
    }
}

// Core Sign In function
async function handleSignIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Use user.displayName or fall back to the local map for Brayden/Youna
        currentUserProfile = userCredential.user.displayName
            ? { displayName: userCredential.user.displayName, email: userCredential.user.email }
            : getProfileFromEmail(userCredential.user.email);
        
        currentUser = userCredential.user;
        showToast(`Welcome back, ${currentUserProfile.displayName}!`, 'success');
        hideLogin();
        
    } catch (error) {
        // Re-throw the error to be handled by the dispatcher
        throw error;
    }
}

// New: Core Sign Up function
async function handleSignUp(email, password, displayName) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Set the display name on the Firebase User object
        await updateProfile(user, { displayName: displayName });
        
        currentUserProfile = { displayName: displayName, email: email };
        currentUser = user;
        showToast(`Account created! Welcome, ${displayName}!`, 'success');
        hideLogin();
        
    } catch (error) {
        // Re-throw the error to be handled by the dispatcher
        throw error;
    }
}

// New: Dispatcher for Sign In and Sign Up
async function handleAuthAction() {
    if (authPrimaryBtn?.disabled) return;
    
    const email = authEmailInput?.value.trim();
    const password = authPasswordInput?.value;
    const displayName = authDisplayNameInput?.value?.trim();
    
    if (!email || !password || (isSignUpState && !displayName)) {
        showToast('Please fill out all required fields.', 'error');
        return;
    }
    
    try {
        if(authPrimaryBtn) authPrimaryBtn.textContent = isSignUpState ? 'Creating Account...' : 'Signing In...';
        if(authPrimaryBtn) authPrimaryBtn.disabled = true;

        if (isSignUpState) {
            await handleSignUp(email, password, displayName);
        } else {
            await handleSignIn(email, password);
        }
    } catch (error) {
        console.error(isSignUpState ? 'Sign Up Error:' : 'Sign In Error:', error.message, error.code);
        
        let displayError;
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            displayError = 'Login failed. Invalid email or password.';
        } else if (error.code === 'auth/email-already-in-use') {
            displayError = 'This email is already in use. Try signing in.';
        } else if (error.code === 'auth/weak-password') {
            displayError = 'Password must be at least 6 characters long.';
        } else if (error.code === 'auth/invalid-email') {
            displayError = 'Invalid email format.';
        } else if (error.code === 'auth/too-many-requests') {
            displayError = 'Too many failed attempts. Try again later.';
        } else {
            displayError = `Authentication failed. Please try again.`;
        }
        
        showToast(displayError, 'error');
        // alert(displayError); // Optional: use a more intrusive alert for serious errors
    } finally {
        if(authPrimaryBtn) authPrimaryBtn.textContent = isSignUpState ? 'Create Account' : 'Sign In';
        if(authPrimaryBtn) authPrimaryBtn.disabled = false;
        checkFormValidity();
    }
}

// New: Toggles the UI state between Sign In and Sign Up
function toggleAuthState(signUp = !isSignUpState) {
    isSignUpState = signUp;
    
    if (isSignUpState) {
        if(authTitle) authTitle.textContent = 'Create Account';
        if(authSubtitle) authSubtitle.textContent = 'Register a new account';
        if(authPrimaryBtn) authPrimaryBtn.textContent = 'Create Account';
        if(authDisplayNameInput) authDisplayNameInput.style.display = 'block';
        if(authSwitchLink) authSwitchLink.innerHTML = 'Already have an account? <strong>Sign In</strong>';
        // Hide profile buttons for new accounts
        if(braydenLoginBtn) braydenLoginBtn.style.display = 'none';
        if(younaLoginBtn) younaLoginBtn.style.display = 'none';
        // Clear inputs when switching to create account
        if(authEmailInput) authEmailInput.value = '';
        if(authPasswordInput) authPasswordInput.value = '';
        if(authDisplayNameInput) authDisplayNameInput.value = '';
    } else {
        if(authTitle) authTitle.textContent = 'Sign In';
        if(authSubtitle) authSubtitle.textContent = 'Choose your profile (or enter credentials)';
        if(authPrimaryBtn) authPrimaryBtn.textContent = 'Sign In';
        if(authDisplayNameInput) authDisplayNameInput.style.display = 'none';
        if(authSwitchLink) authSwitchLink.innerHTML = 'Need an account? <strong>Create One</strong>';
        // Restore profile buttons
        if(braydenLoginBtn) braydenLoginBtn.style.display = 'inline-block';
        if(younaLoginBtn) younaLoginBtn.style.display = 'inline-block';
        // Reset to default selected profile
        selectProfile('brayden');
        if(authDisplayNameInput) authDisplayNameInput.value = '';
    }
    checkFormValidity();
}


// Attach Login Event Listeners - ONLY ONCE (UPDATED)
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
authDisplayNameInput?.addEventListener('input', checkFormValidity); // New listener for display name
authPrimaryBtn?.addEventListener('click', handleAuthAction); // Use new dispatcher function

// New listener for the sign-up/sign-in toggle link
authSwitchLink?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthState();
});

authPasswordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !authPrimaryBtn.disabled) {
        handleAuthAction();
    }
});

// Logout listener
logoutBtn?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showToast('Signed out successfully.', 'info');
    } catch (error) {
        console.error('Logout Error:', error);
        showToast('Failed to sign out. Try again.', 'error');
    }
});


// Authentication State Observer (UPDATED)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Use user.displayName first, then fall back to the local map
        currentUserProfile = user.displayName
            ? { displayName: user.displayName, email: user.email }
            : getProfileFromEmail(user.email);
            
        currentUser = user;
        
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
        if(authDisplayNameInput) authDisplayNameInput.value = '';

        // Reset to sign-in state and pre-select profile for convenience
        toggleAuthState(false);
        
        updateUserDisplay(null);
        showLogin();
    }
});

/* ================= FIREBASE REALTIME PRESENCE ================= */

function setupPresence(user) {
    if (!user) return;
    const userRef = ref(rtdb, 'presence/' + user.uid);
    
    // Set up what happens when the user disconnects
    onDisconnect(userRef).set({
        email: user.email,
        displayName: currentUserProfile.displayName,
        online: false,
        lastSeen: new Date().toISOString()
    });

    // Set user as online
    set(userRef, {
        email: user.email,
        displayName: currentUserProfile.displayName,
        online: true,
        lastSeen: new Date().toISOString()
    });

    // Monitor partner's status
    const partnerId = Object.keys(USERS).find(e => USERS[e] !== user.email);
    const partnerEmail = USERS[partnerId];
    
    // Find partner UID by looping through all presence records
    // This is less efficient but necessary if you don't store partner UID relationship
    onValue(ref(rtdb, 'presence'), (snapshot) => {
        const presenceData = snapshot.val();
        if (presenceData) {
            const partnerEntry = Object.values(presenceData).find(p => p.email === partnerEmail);
            const partnerStatusElement = document.getElementById('partnerStatus');

            if (partnerStatusElement) {
                if (partnerEntry && partnerEntry.online) {
                    partnerStatusElement.innerHTML = `<span class="online-dot"></span> ${partnerEntry.displayName} is Online`;
                } else if (partnerEntry && partnerEntry.lastSeen) {
                    const lastSeenDate = new Date(partnerEntry.lastSeen);
                    partnerStatusElement.innerHTML = `Offline. Last seen ${lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else {
                    partnerStatusElement.textContent = `${USER_MAP[partnerEmail]} is Offline`;
                }
            }
        }
    });
}


/* ================= COUNTDOWN TIMER ================= */

function updateTimeTogether() {
    const now = new Date();
    const diffInMilliseconds = now - DEBUT_DATE;
    
    if (diffInMilliseconds < 0) return; // Not yet our date

    const seconds = Math.floor(diffInMilliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / (365.25 / 12));
    const years = Math.floor(months / 12);

    const remainingDays = days % 30; // Approx
    const remainingMonths = months % 12;
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    let timeString = '';
    if (years > 0) timeString += `${years}y `;
    if (remainingMonths > 0) timeString += `${remainingMonths}m `;
    timeString += `${remainingDays}d`; // Always show at least days

    const countdownElement = document.getElementById('countdown');
    if(countdownElement) countdownElement.textContent = `Together for: ${timeString.trim()}`;
}
setInterval(updateTimeTogether, 60000); // Update every minute

/* ================= NOTES ================= */

function renderNotes() {
    const notesContainer = document.getElementById('notesContainer');
    if (!notesContainer) return;
    
    const notesQuery = query(collection(db, "notes"), orderBy("createdAt", "desc"));

    onSnapshot(notesQuery, (snapshot) => {
        notesContainer.innerHTML = '';
        const notes = [];
        let latestNote = null;
        
        snapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() };
            notes.push(note);
            if (!latestNote || note.createdAt.toDate() > latestNote.createdAt.toDate()) {
                latestNote = note;
            }
        });

        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'card note-card blur-bg';
            noteCard.innerHTML = `
                <h4>${truncateText(note.title, 50)}</h4>
                <p class="subtext">By ${note.author} on ${formatTimestamp(note.createdAt)}</p>
                <div class="note-snippet">${truncateText(note.content, 200)}</div>
                <button class="btn ghost small read-note-btn" data-id="${note.id}">Read More</button>
            `;
            notesContainer.appendChild(noteCard);
        });

        // Update Dashboard Snippet
        const snippetEl = document.getElementById('latestNoteSnippet');
        if (latestNote && snippetEl) {
            snippetEl.innerHTML = `
                <p><strong>${truncateText(latestNote.title, 50)}</strong></p>
                <p class="subtext">By ${latestNote.author}</p>
                <p class="note-snippet-text">${truncateText(latestNote.content, 80)}</p>
            `;
        } else if(snippetEl) {
            snippetEl.innerHTML = '<p class="subtext">No notes yet.</p>';
        }

        // Attach Read More listeners
        document.querySelectorAll('.read-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => showNoteModal(e.target.getAttribute('data-id'), notes));
        });
    });
}

function showNoteModal(noteId, notes) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    // Use mediaModal for note viewing
    const mediaModal = document.getElementById('mediaModal');
    const titleEl = document.getElementById('mediaModalTitle');
    const contentEl = document.getElementById('mediaModalContent');
    if (!mediaModal || !titleEl || !contentEl) return;

    titleEl.textContent = note.title;
    contentEl.innerHTML = `
        <p class="subtext">By ${note.author} on ${formatTimestamp(note.createdAt)}</p>
        <div class="full-note-content">${note.content.replace(/\n/g, '<br>')}</div>
    `;

    mediaModal.classList.add('active');
}

document.getElementById('addNoteBtn')?.addEventListener('click', () => {
    // Re-use memoryModal structure for a new note, but rename fields
    const modal = document.getElementById('memoryModal');
    const titleInput = document.getElementById('memoryTitle');
    const descInput = document.getElementById('memoryDesc');
    const saveBtn = document.getElementById('saveMemoryBtn');
    const header = modal.querySelector('h3');

    header.textContent = 'Write a New Note';
    titleInput.placeholder = 'Note Title';
    descInput.placeholder = 'Your thoughts...';
    
    titleInput.value = '';
    descInput.value = '';
    
    // Hide geo controls
    modal.querySelector('.geo-controls').style.display = 'none';

    // Change button text
    saveBtn.textContent = 'Save Note';
    saveBtn.onclick = async () => {
        const title = titleInput.value.trim();
        const content = descInput.value.trim();
        
        if (!title || !content) {
            showToast('Title and content cannot be empty.', 'error');
            return;
        }

        try {
            await addDoc(collection(db, "notes"), {
                title: title,
                content: content,
                author: currentUserProfile.displayName,
                authorEmail: currentUser.email,
                createdAt: serverTimestamp()
            });
            showToast('Note saved!', 'success');
            modal.classList.remove('active');
        } catch (e) {
            console.error("Error adding document: ", e);
            showToast('Error saving note.', 'error');
        }
    };
    
    document.getElementById('cancelMemoryBtn').onclick = () => modal.classList.remove('active');
    
    modal.classList.add('active');
});

/* ================= MUSIC ================= */

function renderMusic() {
    const musicContainer = document.getElementById('currentMusic');
    if (!musicContainer) return;
    
    const musicQuery = query(collection(db, "music"), orderBy("timestamp", "desc"), limit(1));

    onSnapshot(musicQuery, (snapshot) => {
        musicContainer.innerHTML = '';
        if (snapshot.empty) {
            musicContainer.innerHTML = '<i class="fas fa-music"></i><p>Nothing playing right now. Add a song!</p>';
            return;
        }

        const latestSong = snapshot.docs[0].data();
        musicContainer.innerHTML = `
            <div class="music-details">
                <i class="fas fa-headphones-alt"></i>
                <p><strong>${truncateText(latestSong.title, 30)}</strong></p>
                <p class="subtext">${truncateText(latestSong.artist, 30)}</p>
            </div>
            <p class="subtext music-meta">Added by ${latestSong.addedBy} at ${formatTimestamp(latestSong.timestamp)}</p>
        `;
    });
}

document.getElementById('addMusicBtn')?.addEventListener('click', () => {
    // Re-use mediaModal for adding music
    const modal = document.getElementById('mediaModal');
    const titleEl = document.getElementById('mediaModalTitle');
    const contentEl = document.getElementById('mediaModalContent');
    const closeBtn = document.getElementById('closeMediaModalBtn');

    titleEl.textContent = 'Add Current Song';
    contentEl.innerHTML = `
        <input type="text" id="songTitleInput" placeholder="Song Title" class="glass-input" required>
        <input type="text" id="songArtistInput" placeholder="Artist Name" class="glass-input" required>
        <button id="saveSongBtn" class="btn primary full-width" style="margin-top: 15px;">Add Song</button>
    `;

    closeBtn.textContent = 'Cancel';
    closeBtn.onclick = () => modal.classList.remove('active');

    document.getElementById('saveSongBtn').onclick = async () => {
        const title = document.getElementById('songTitleInput').value.trim();
        const artist = document.getElementById('songArtistInput').value.trim();

        if (!title || !artist) {
            showToast('Please enter both title and artist.', 'error');
            return;
        }

        try {
            await addDoc(collection(db, "music"), {
                title: title,
                artist: artist,
                addedBy: currentUserProfile.displayName,
                timestamp: serverTimestamp()
            });
            showToast('Song added to playlist!', 'success');
            modal.classList.remove('active');
        } catch (e) {
            console.error("Error adding music: ", e);
            showToast('Error adding song.', 'error');
        }
    };

    modal.classList.add('active');
});

/* ================= FAVORITES ================= */

function renderFavorites() {
    const listEl = document.getElementById('favoritesList');
    if (!listEl) return;
    
    const favQuery = query(collection(db, "favorites"), orderBy("createdAt", "asc"));

    onSnapshot(favQuery, (snapshot) => {
        listEl.innerHTML = '';
        snapshot.forEach((doc) => {
            const item = { id: doc.id, ...doc.data() };
            const li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = `
                <i class="fas fa-heart"></i>
                <span>${item.text}</span>
                <button class="btn ghost small delete-favorite" data-id="${item.id}"><i class="fas fa-times"></i></button>
            `;
            listEl.appendChild(li);
        });

        document.querySelectorAll('.delete-favorite').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = e.currentTarget.getAttribute('data-id');
                if (confirm('Are you sure you want to remove this favorite?')) {
                    try {
                        await deleteDoc(doc(db, "favorites", itemId));
                        showToast('Favorite removed.', 'info');
                    } catch (e) {
                        console.error("Error removing favorite: ", e);
                        showToast('Error removing favorite.', 'error');
                    }
                }
            });
        });
    });
}

document.getElementById('addFavoriteBtn')?.addEventListener('click', () => {
    const text = prompt("Enter a new favorite thing/place/memory:");
    if (text) {
        addDoc(collection(db, "favorites"), {
            text: text,
            createdAt: serverTimestamp()
        })
        .then(() => showToast('Favorite added!', 'success'))
        .catch(e => {
            console.error("Error adding favorite: ", e);
            showToast('Error adding favorite.', 'error');
        });
    }
});

/* ================= GALLERY (Photos/Videos) ================= */

function renderGallery(type) {
    const containerId = type === 'photos' ? 'photoGallery' : 'videoGallery';
    const container = document.getElementById(containerId);
    if (!container) return;

    const mediaQuery = query(collection(db, "media"), where("type", "==", type), orderBy("uploadedAt", "desc"));

    onSnapshot(mediaQuery, (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const media = { id: doc.id, ...doc.data() };
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            if (type === 'photos') {
                item.innerHTML = `<img src="${media.url}" alt="Photo" class="gallery-image" data-id="${media.id}">`;
                item.style.backgroundImage = `url(${media.url})`;
            } else { // type === 'videos'
                item.innerHTML = `
                    <video src="${media.url}" class="gallery-video" data-id="${media.id}" preload="metadata"></video>
                    <div class="video-overlay"><i class="fas fa-play"></i></div>
                `;
            }
            
            item.querySelector('img, video')?.addEventListener('click', () => openLightbox(media));
            container.appendChild(item);
        });
    });
}

// Tab switcher for gallery
document.querySelectorAll('.gallery-tabs .btn').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('.gallery-tabs .btn').forEach(btn => {
            btn.classList.remove('active', 'secondary');
            btn.classList.add('ghost');
        });
        e.target.classList.add('active', 'secondary');
        e.target.classList.remove('ghost');

        const type = e.target.getAttribute('data-type');
        document.getElementById('photoGallery').style.display = type === 'photos' ? 'grid' : 'none';
        document.getElementById('videoGallery').style.display = type === 'videos' ? 'grid' : 'none';
    });
});


/* ================= LIGHTBOX (Media Viewer) ================= */

const lightbox = document.getElementById('lightbox');
const lightboxMediaContainer = document.querySelector('.lightbox-media-container');
const lightboxCaption = document.querySelector('.lightbox-caption');

function openLightbox(media) {
    lightboxMediaContainer.innerHTML = '';
    
    if (media.type === 'photos') {
        const img = document.createElement('img');
        img.src = media.url;
        lightboxMediaContainer.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = media.url;
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        lightboxMediaContainer.appendChild(video);
    }
    
    lightboxCaption.textContent = media.caption || `Uploaded by ${media.uploadedBy}`;
    lightbox.classList.add('active');

    // Add reactions/comments
    renderMediaMeta(media.id, media.reactions || {}, media.comments || []);
}

function closeLightbox() {
    lightbox.classList.remove('active');
    lightboxMediaContainer.innerHTML = '';
}

document.querySelectorAll('.close-lightbox').forEach(el => el.addEventListener('click', closeLightbox));


/* ================= MEDIA META (Reactions/Comments) ================= */

function renderMediaMeta(mediaId, reactions, comments) {
    const metaEl = document.querySelector('.lightbox-meta');
    if (!metaEl) return;

    metaEl.innerHTML = `
        <p class="lightbox-caption"></p>
        <div class="media-reactions">
            </div>
        <div class="media-comments">
            <h4>Comments</h4>
            <div id="commentsList">
                ${comments.map(c => `<div class="comment-item"><strong>${c.user}:</strong> ${c.text}</div>`).join('')}
            </div>
            <input type="text" id="newCommentInput" placeholder="Add a comment..." class="glass-input small" style="margin-top: 10px;">
        </div>
    `;
    
    // Reaction Emojis
    const reactionEmojis = ['❤️', '😂', '🥹', '🔥', '🥺'];
    const reactionsEl = metaEl.querySelector('.media-reactions');
    
    reactionEmojis.forEach(emoji => {
        const count = reactions[emoji] ? reactions[emoji].length : 0;
        const btn = document.createElement('button');
        btn.className = `btn ghost small reaction-btn ${reactions[emoji]?.includes(currentUser.uid) ? 'active' : ''}`;
        btn.innerHTML = `${emoji} ${count > 0 ? count : ''}`;
        btn.onclick = () => toggleReaction(mediaId, emoji);
        reactionsEl.appendChild(btn);
    });

    // Comment listener
    const commentInput = document.getElementById('newCommentInput');
    commentInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && commentInput.value.trim() !== '') {
            addComment(mediaId, commentInput.value.trim());
            commentInput.value = '';
        }
    });
}

async function toggleReaction(mediaId, emoji) {
    const mediaRef = doc(db, "media", mediaId);
    const userUid = currentUser.uid;

    try {
        const docSnap = await getDoc(mediaRef);
        const reactions = docSnap.data().reactions || {};
        const reactionUsers = reactions[emoji] || [];

        let update;
        if (reactionUsers.includes(userUid)) {
            // Remove reaction
            update = { [`reactions.${emoji}`]: arrayRemove(userUid) };
        } else {
            // Add reaction
            update = { [`reactions.${emoji}`]: arrayUnion(userUid) };
        }
        await updateDoc(mediaRef, update);
    } catch (e) {
        console.error("Error toggling reaction: ", e);
        showToast('Failed to update reaction.', 'error');
    }
}

async function addComment(mediaId, text) {
    const mediaRef = doc(db, "media", mediaId);
    const newComment = {
        user: currentUserProfile.displayName,
        text: text,
        timestamp: serverTimestamp()
    };

    try {
        await updateDoc(mediaRef, {
            comments: arrayUnion(newComment)
        });
        showToast('Comment posted!', 'success');
        // Re-render meta to show new comment (will happen via onSnapshot, but force for quick update if needed)
    } catch (e) {
        console.error("Error adding comment: ", e);
        showToast('Failed to post comment.', 'error');
    }
}


/* ================= MAP (Memories) ================= */

function initMap() {
    if (mapInstance) return; // Prevent re-initialization

    mapInstance = L.map('leafletMap', {
        minZoom: 2,
        maxZoom: 18
    }).setView([39.8283, -98.5795], 4); // Center of US

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    renderMapMemories();
}

function renderMapMemories() {
    const memoriesQuery = query(collection(db, "memories"), orderBy("createdAt", "desc"));
    const markers = L.layerGroup().addTo(mapInstance);
    markers.clearLayers();

    onSnapshot(memoriesQuery, (snapshot) => {
        markers.clearLayers();
        snapshot.forEach((doc) => {
            const memory = { id: doc.id, ...doc.data() };
            if (memory.lat && memory.lng) {
                const marker = L.marker([memory.lat, memory.lng]).addTo(markers);
                marker.bindPopup(`
                    <strong>${memory.title}</strong><br>
                    <p>${truncateText(memory.description, 100)}</p>
                    <p class="subtext">By ${memory.author} on ${formatTimestamp(memory.createdAt)}</p>
                `);
            }
        });
    });
}

document.getElementById('addMemoryBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('memoryModal');
    const titleInput = document.getElementById('memoryTitle');
    const descInput = document.getElementById('memoryDesc');
    const latInput = document.getElementById('latInput');
    const lngInput = document.getElementById('lngInput');
    const saveBtn = document.getElementById('saveMemoryBtn');
    const header = modal.querySelector('h3');

    header.textContent = 'Add Location';
    titleInput.placeholder = 'Location Name';
    descInput.placeholder = 'Description';

    titleInput.value = '';
    descInput.value = '';
    latInput.value = '';
    lngInput.value = '';

    // Show geo controls
    modal.querySelector('.geo-controls').style.display = 'flex';
    
    saveBtn.textContent = 'Save';
    saveBtn.onclick = async () => {
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        if (!title || !description || isNaN(lat) || isNaN(lng)) {
            showToast('Please fill out all fields correctly.', 'error');
            return;
        }

        try {
            await addDoc(collection(db, "memories"), {
                title: title,
                description: description,
                lat: lat,
                lng: lng,
                author: currentUserProfile.displayName,
                createdAt: serverTimestamp()
            });
            showToast('Memory saved to map!', 'success');
            modal.classList.remove('active');
        } catch (e) {
            console.error("Error adding memory: ", e);
            showToast('Error saving memory.', 'error');
        }
    };
    
    document.getElementById('cancelMemoryBtn').onclick = () => modal.classList.remove('active');
    
    modal.classList.add('active');
});

document.getElementById('getCurrentLocation')?.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            document.getElementById('latInput').value = position.coords.latitude.toFixed(6);
            document.getElementById('lngInput').value = position.coords.longitude.toFixed(6);
        }, (error) => {
            console.error("Geolocation error: ", error);
            showToast('Failed to get location. Enter manually.', 'error');
        });
    } else {
        showToast('Geolocation is not supported by your browser.', 'error');
    }
});


/* ================= TIMELINE ================= */

function renderTimeline() {
    const timelineContainer = document.getElementById('timeline-list');
    if (!timelineContainer) return;

    const timelineQuery = query(collection(db, "timeline"), orderBy("date", "desc"));

    onSnapshot(timelineQuery, (snapshot) => {
        timelineContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const event = { id: doc.id, ...doc.data() };
            const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
            const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            
            const eventEl = document.createElement('div');
            eventEl.className = 'timeline-item card blur-bg';
            eventEl.innerHTML = `
                <div class="timeline-date">${formattedDate}</div>
                <div class="timeline-content">
                    <h4>${event.title}</h4>
                    <p class="subtext">${event.description}</p>
                </div>
            `;
            timelineContainer.appendChild(eventEl);
        });
    });
}

/* ================= DASHBOARD / MOOD CHART ================= */

function renderDashboard() {
    initMap(); // Ensure map is initialized

    // Set up mood chart
    const moodQuery = query(collection(db, "moods"), orderBy("timestamp", "desc"), limit(30));

    onSnapshot(moodQuery, (snapshot) => {
        const moodData = [];
        let latestTimestamp = 'n/a';
        snapshot.forEach((doc) => {
            moodData.push(doc.data());
            latestTimestamp = doc.data().timestamp;
        });
        
        // Data for chart is usually in ascending order for time series
        moodData.reverse();

        const labels = moodData.map(d => {
            const date = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        });
        const scores = moodData.map(d => d.score);

        const canvas = document.getElementById('moodChartCanvas');
        if (!canvas) return;

        const data = {
            labels: labels,
            datasets: [{
                label: 'Happiness Score',
                data: scores,
                borderColor: 'rgb(195, 141, 158)', // var(--primary)
                tension: 0.4,
                pointRadius: 5,
                backgroundColor: 'rgba(195, 141, 158, 0.2)',
                fill: true
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
                            stepSize: 1
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

        // Destroy old chart instance if it exists
        if (moodChart) {
            moodChart.destroy();
        }

        // Initialize new chart
        moodChart = new Chart(canvas, config);
        
        // Update last update time
        const lastUpdateEl = document.getElementById('lastMoodUpdate');
        if (lastUpdateEl && latestTimestamp !== 'n/a') {
             lastUpdateEl.textContent = formatTimestamp(latestTimestamp);
        }
    });
}


/* ================= MEDIA UPLOAD ================= */

document.getElementById('addMediaBtn')?.addEventListener('click', () => {
    // Re-use mediaModal for media upload options
    const modal = document.getElementById('mediaModal');
    const titleEl = document.getElementById('mediaModalTitle');
    const contentEl = document.getElementById('mediaModalContent');
    const closeBtn = document.getElementById('closeMediaModalBtn');

    titleEl.textContent = 'Upload Media';
    contentEl.innerHTML = `
        <input type="file" id="mediaFileInput" accept="image/*,video/*" class="glass-input" required>
        <input type="text" id="mediaCaptionInput" placeholder="Caption (optional)" class="glass-input">
        <button id="uploadMediaBtn" class="btn primary full-width" style="margin-top: 15px;">Upload</button>
        <progress id="uploadProgressBar" value="0" max="100" style="width: 100%; margin-top: 10px; display: none;"></progress>
    `;

    closeBtn.textContent = 'Cancel';
    closeBtn.onclick = () => modal.classList.remove('active');

    const uploadBtn = document.getElementById('uploadMediaBtn');
    const fileInput = document.getElementById('mediaFileInput');
    const progressBar = document.getElementById('uploadProgressBar');

    uploadBtn.onclick = async () => {
        const file = fileInput.files[0];
        const caption = document.getElementById('mediaCaptionInput').value.trim();

        if (!file) {
            showToast('Please select a file to upload.', 'error');
            return;
        }

        uploadBtn.disabled = true;
        progressBar.style.display = 'block';

        const fileType = file.type.startsWith('image/') ? 'photos' : file.type.startsWith('video/') ? 'videos' : 'other';
        if (fileType === 'other') {
            showToast('Only image and video files are supported.', 'error');
            uploadBtn.disabled = false;
            progressBar.style.display = 'none';
            return;
        }

        const fileName = `${Date.now()}_${file.name}`;
        const sRef = storageRef(storage, `${fileType}/${fileName}`);
        const uploadTask = uploadBytesResumable(sRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.value = progress;
            },
            (error) => {
                console.error("Upload error: ", error);
                showToast('Upload failed.', 'error');
                uploadBtn.disabled = false;
                progressBar.style.display = 'none';
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    
                    // Save metadata to Firestore
                    await addDoc(collection(db, "media"), {
                        url: downloadURL,
                        type: fileType,
                        caption: caption,
                        uploadedBy: currentUserProfile.displayName,
                        uploadedAt: serverTimestamp(),
                        reactions: {},
                        comments: []
                    });

                    showToast('Media uploaded successfully!', 'success');
                    modal.classList.remove('active');
                } catch (e) {
                    console.error("Error saving media metadata: ", e);
                    showToast('Upload succeeded, but metadata failed to save.', 'error');
                } finally {
                    uploadBtn.disabled = false;
                    progressBar.style.display = 'none';
                    progressBar.value = 0;
                }
            }
        );
    };

    modal.classList.add('active');
});


/* ================= INIT ================= */
function initApp() {
    // Show the main container once the user is authenticated and data is ready to load
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
    document.querySelector('.tab-btn[data-section="dashboard"]')?.click();
}


/* ================= INITIALIZATION & THEME ================= */
document.getElementById('darkModeToggle')?.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
});
