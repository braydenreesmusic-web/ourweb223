// script.js - Optimized, Functional, and Amazing (FULLY IMPLEMENTED)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, limit, setDoc, getDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

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
const storage = getStorage(app);

const collections = {
  photos: collection(db, "photos"),
  videos: collection(db, "videos"),
  music: collection(db, "music"),
  notes: collection(db, "notes"),
  events: collection(db, "events"),
  timeline: collection(db, "timeline"),
  favorites: collection(db, "favorites"),
  memories: collection(db, "memories"),
  appData: collection(db, "appData") // Global data (like savings goal)
};

// NOTE: Please replace these with your actual user credentials if they differ.
const USER_MAP = { 'brayden@test.com': 'Brayden', 'youna@test.com': 'Youna' };
const USERS = { brayden: 'brayden@test.com', youna: 'youna@test.com' };
const START_DATE = new Date("2024-03-01T00:00:00"); // Your relationship start date

let currentUser = null;
let mapInstance = null;
let memoryMarkers = [];
let mediaMarkers = [];
let currentNoteId = null;

/* ================= UTILITY & UI HELPERS ================= */
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

function updateTimeTogether() {
    const counter = document.getElementById('timeTogether');
    if(!counter) return;
    
    const now = new Date();
    const diff = now - START_DATE;
    
    // Calculations
    const totalSeconds = Math.floor(diff / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const years = Math.floor(totalDays / 365.25);
    const daysInYear = 365.25;
    const remainingDaysAfterYears = totalDays - Math.floor(years * daysInYear);
    const months = Math.floor(remainingDaysAfterYears / 30.4375); // Average month length
    const days = Math.floor(remainingDaysAfterYears - Math.floor(months * 30.4375));
    
    // Time components for the current day
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Format the output
    const timeTogetherString = `${years}y, ${months}m, ${days}d & ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    counter.innerHTML = `**${timeTogetherString}**`;
    requestAnimationFrame(updateTimeTogether); // Use requestAnimationFrame for smooth counter
}

async function addToTimeline(action) {
    if(!currentUser) return;
    try {
        await addDoc(collections.timeline, {
            action,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
    } catch(e) {
        console.error("Timeline logging failed:", e);
    }
}

/* ================= AUTH & PRESENCE ================= */
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const braydenLogin = document.getElementById("braydenLogin");
const younaLogin = document.getElementById("younaLogin");
const authEmail = document.getElementById("authEmail");
const signInBtn = document.getElementById("signInBtn");

if(braydenLogin && younaLogin && authEmail) {
    // Initial setup to Brayden
    authEmail.value = USERS.brayden;
    
    braydenLogin?.addEventListener("click", () => {
        braydenLogin.classList.add('active');
        younaLogin.classList.remove('active');
        authEmail.value = USERS.brayden;
    });
    younaLogin?.addEventListener("click", () => {
        younaLogin.classList.add('active');
        braydenLogin.classList.remove('active');
        authEmail.value = USERS.youna;
    });
}

signInBtn?.addEventListener("click", async () => {
    try {
        const pass = document.getElementById("authPassword").value;
        await signInWithEmailAndPassword(auth, authEmail.value, pass);
        showToast("Welcome home.", "success");
    } catch (e) {
        console.error(e);
        // Clean up error message for display
        const msg = e.message.includes('password') ? 'Incorrect password.' : 'Login failed.';
        showToast(msg, "error");
    }
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    if (currentUser) {
        // Set self offline in Realtime DB
        await set(ref(rtdb, `presence/${currentUser.uid}`), { online: false, user: USER_MAP[currentUser.email], timestamp: Date.now() });
    }
    await signOut(auth);
});

onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
        loginSection?.classList.add("hidden");
        appSection?.classList.remove("hidden");
        setupPresence(user);
        initApp();
    } else {
        loginSection?.classList.remove("hidden");
        appSection?.classList.add("hidden");
    }
});

function setupPresence(user) {
    const userRef = ref(rtdb, `presence/${user.uid}`);
    const userName = USER_MAP[user.email];
    
    // Set user online initially
    set(userRef, { online: true, user: userName, timestamp: Date.now() });
    // Set user offline when they disconnect
    onDisconnect(userRef).set({ online: false, user: userName, timestamp: Date.now() });
    
    // Listen for the other user's status
    onValue(ref(rtdb, 'presence'), snap => {
        const data = snap.val() || {};
        const isBrayden = userName === 'Brayden';
        const otherUser = isBrayden ? 'Youna' : 'Brayden';
        const statusTextEl = document.getElementById('statusText');
        const onlineIndicator = document.getElementById('onlineIndicator');

        let otherIsOnline = false;
        
        Object.values(data).forEach(p => {
            if(p.user === otherUser) {
                otherIsOnline = p.online;
            }
        });

        if (statusTextEl && onlineIndicator) {
             if (otherIsOnline) {
                statusTextEl.textContent = `${otherUser} is currently **online**.`;
                onlineIndicator.classList.add('online');
             } else {
                statusTextEl.textContent = `${otherUser} is offline.`;
                onlineIndicator.classList.remove('online');
             }
        }
    });
}

/* ================= SAVINGS GOAL LOGIC ================= */
const SAVINGS_DOC_ID = 'currentSavings';

function renderSavings() {
    const currentSavingsEl = document.getElementById('currentSavings');
    const savingsGoalEl = document.getElementById('goalAmountDisplay'); // Fix ID
    const progressLine = document.getElementById('progressLine'); // Fix ID
    const statusLine = document.getElementById('statusLine'); // Fix ID

    if(!currentSavingsEl || !savingsGoalEl) return;

    onSnapshot(doc(db, 'appData', SAVINGS_DOC_ID), (docSnap) => {
        const data = docSnap.data() || { total: 0, goal: 10000 };
        const total = data.total || 0;
        const goal = data.goal || 10000;
        const percent = Math.min(100, (total / goal) * 100);

        currentSavingsEl.textContent = `$${total.toFixed(2)}`;
        savingsGoalEl.textContent = `$${goal.toFixed(2)}`;
        
        if (progressLine && statusLine) {
            progressLine.style.width = `${percent}%`;
            statusLine.textContent = `**${percent.toFixed(0)}%** Complete`;
            progressLine.style.backgroundColor = percent >= 100 ? 'var(--success-color)' : 'var(--primary-color)';
        }
    });
}

// Modal Toggle Handlers (for Savings and Goal)
document.getElementById('logSavingsBtn')?.addEventListener('click', () => document.getElementById('savingsModal').classList.add('active'));
document.getElementById('cancelSavingsBtn')?.addEventListener('click', () => document.getElementById('savingsModal').classList.remove('active'));
document.getElementById('setGoalButton')?.addEventListener('click', () => document.getElementById('goalModal').classList.add('active')); // Fix ID
document.getElementById('cancelGoalBtn')?.addEventListener('click', () => document.getElementById('goalModal').classList.remove('active'));

document.getElementById('saveSavingsBtn')?.addEventListener('click', logSavings);
document.getElementById('setGoalBtn')?.addEventListener('click', setSavingsGoal);

async function logSavings() {
    const input = document.getElementById('savingsAmountInput');
    const note = document.getElementById('savingsNoteInput').value;
    const amount = parseFloat(input.value);

    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid amount.", "error");
        return;
    }

    try {
        const savingsRef = doc(db, 'appData', SAVINGS_DOC_ID);
        // Safely update the total using get/set/merge
        const snap = await getDoc(savingsRef);
        const currentTotal = snap.exists() ? snap.data().total || 0 : 0;
        const goal = snap.exists() ? snap.data().goal || 10000 : 10000;
        const newTotal = currentTotal + amount;

        await setDoc(savingsRef, {
            total: newTotal,
            goal: goal
        }, { merge: true });
        
        // Log transaction history to a separate collection
        await addDoc(collection(db, "savings_log"), {
            amount: amount,
            note: note,
            timestamp: serverTimestamp(),
            type: 'deposit',
            user: USER_MAP[currentUser.email]
        });

        document.getElementById('savingsModal').classList.remove('active');
        input.value = '';
        document.getElementById('savingsNoteInput').value = '';
        showToast(`Logged $${amount.toFixed(2)} in savings!`, "success");
        addToTimeline(`Logged $${amount.toFixed(2)} to savings goal (${note})`);

    } catch (e) {
        console.error("Error logging savings:", e);
        showToast("Failed to log savings.", "error");
    }
}

async function setSavingsGoal() {
    const input = document.getElementById('goalAmountInput');
    const goalAmount = parseFloat(input.value);

    if (isNaN(goalAmount) || goalAmount <= 0) {
        showToast("Please enter a valid goal amount.", "error");
        return;
    }

    try {
        const savingsRef = doc(db, 'appData', SAVINGS_DOC_ID);
        // Use setDoc with merge to only update the goal, preserving the total
        await setDoc(savingsRef, {
            goal: goalAmount
        }, { merge: true });
        
        document.getElementById('goalModal').classList.remove('active');
        showToast(`Savings goal set to $${goalAmount.toFixed(2)}.`, "success");
        addToTimeline(`Set savings goal to $${goalAmount.toFixed(2)}`);

    } catch (e) {
        console.error("Error setting goal:", e);
        showToast("Failed to set goal.", "error");
    }
}


/* ================= NOTES & REPLIES ================= */
const replyModal = document.getElementById('replyModal');
const originalNoteContent = document.getElementById('originalNoteContent');
const replyInput = document.getElementById('replyInput');
const sendReplyBtn = document.getElementById('sendReplyBtn');
const timelineStatusButton = document.getElementById('timelineStatusButton'); // Button to open reply modal

// Open the reply sheet (used for both new posts and replies)
function openReplySheet(mode = 'new', noteId = null, data = null) {
    currentNoteId = noteId;
    
    // Configure modal for replying to an existing note
    if (mode === 'reply' && data) {
        const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Just now';
        document.querySelector('#replyModal .sheet-header h4').textContent = 'Reply to Note';
        originalNoteContent.classList.remove('hidden');
        originalNoteContent.innerHTML = `
            <div class="note-header">
                <span class="note-date">${escapeHtml(date)} • ${escapeHtml(data.user)}</span>
            </div>
            <p class="note-content">${escapeHtml(data.content)}</p>
        `;
        sendReplyBtn.textContent = 'Reply';
    } else {
        // Configure modal for new timeline post
        document.querySelector('#replyModal .sheet-header h4').textContent = 'New Post';
        originalNoteContent.classList.add('hidden');
        originalNoteContent.innerHTML = '';
        sendReplyBtn.textContent = 'Post';
    }
    
    replyModal?.classList.add('active');
    setTimeout(() => replyInput?.focus(), 300);
}

// Triggers for opening the modal
timelineStatusButton?.addEventListener('click', () => openReplySheet('new'));
document.getElementById('openReplySheetBtn')?.addEventListener('click', () => openReplySheet('new'));


document.querySelector('.close-sheet')?.addEventListener('click', () => {
    replyModal?.classList.remove('active');
    currentNoteId = null;
    replyInput.value = '';
});

sendReplyBtn?.addEventListener('click', async () => {
    const text = replyInput.value.trim();
    if (!text) return;

    try {
        if (currentNoteId) {
            // Case 1: Send a Reply to an existing Note
            const noteRef = doc(db, 'notes', currentNoteId);
            const newReply = {
                content: text,
                user: USER_MAP[currentUser.email],
                timestamp: serverTimestamp()
            };

            await updateDoc(noteRef, {
                replies: arrayUnion(newReply)
            });
            
            showToast("Reply sent.", "success");
            addToTimeline(`Replied to a note: ${text.substring(0, 20)}...`);

        } else {
            // Case 2: Post a new Note/Timeline update (Timeline acts as the Notes section)
            await addDoc(collections.notes, {
                content: text,
                type: 'text',
                user: USER_MAP[currentUser.email],
                timestamp: serverTimestamp(),
                replies: []
            });

            showToast("New post saved.", "success");
            addToTimeline(`Posted: ${text.substring(0, 20)}...`);
        }
        
        replyModal?.classList.remove('active');
        replyInput.value = '';
        currentNoteId = null;

    } catch (e) {
        console.error("Error sending post/reply:", e);
        showToast("Failed to send post.", "error");
    }
});

function renderNotes() {
    const list = document.getElementById('timelineList'); // Using timelineList for combined posts/notes
    
    // Listen for the latest 20 posts/notes
    onSnapshot(query(collections.notes, orderBy('timestamp', 'desc'), limit(20)), snap => {
        list.innerHTML = '';
        
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const time = data.timestamp ? data.timestamp.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Now';
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            const repliesCount = data.replies?.length || 0;
            const isBrayden = data.user === 'Brayden';
            
            // Build the replies summary
            const repliesHtml = data.replies?.map(reply => {
                const replyTime = reply.timestamp ? reply.timestamp.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                return `
                    <div class="reply-item">
                        <span class="reply-user">${escapeHtml(reply.user)}:</span>
                        <span class="reply-content">${escapeHtml(reply.content)}</span>
                        <span class="reply-time">${replyTime}</span>
                    </div>
                `;
            }).join('');

            const postElement = document.createElement('li');
            postElement.classList.add('timeline-item');
            
            postElement.innerHTML = `
                <div class="avatar ${isBrayden ? 'avatar-brayden' : 'avatar-youna'}">${data.user.charAt(0)}</div>
                <div class="content card">
                    <div class="meta">
                        <span class="sender">${escapeHtml(data.user)}</span>
                        <span class="time">${time} &middot; ${date}</span>
                    </div>
                    <p>${escapeHtml(data.content)}</p>
                    <div class="note-actions">
                        <button class="btn ghost small reply-note-trigger" data-id="${id}">
                            💬 ${repliesCount} Reply
                        </button>
                    </div>
                    ${repliesCount > 0 ? `<div class="note-replies list-layout">${repliesHtml}</div>` : ''}
                </div>
            `;
            list.appendChild(postElement);

            // Attach reply listener
            postElement.querySelector('.reply-note-trigger')?.addEventListener('click', (e) => {
                openReplySheet('reply', id, data);
            });
        });
    });
}


/* ================= MEDIA UPLOAD & GALLERY ================= */
const photoInput = document.getElementById('photoInput');
const videoInput = document.getElementById('videoInput');
const galleryPhotoContainer = document.getElementById('galleryPhotoContainer');
const galleryVideoContainer = document.getElementById('galleryVideoContainer');

// Event listeners to trigger file input (Assuming your HTML has hidden file inputs)
document.querySelector('.upload-card[data-type="photos"]')?.addEventListener('click', () => photoInput.click());
document.querySelector('.upload-card[data-type="videos"]')?.addEventListener('click', () => videoInput.click());

photoInput?.addEventListener('change', e => handleUpload(e.target.files, 'photos'));
videoInput?.addEventListener('change', e => handleUpload(e.target.files, 'videos'));


async function handleUpload(files, type) {
    if (!files || files.length === 0 || !currentUser) return;
    
    // UI feedback elements (assuming you have progress bars/indicators)
    const bar = document.getElementById(type === 'photos' ? 'photoProgress' : 'videoProgress');
    const uploadCard = document.querySelector(`.upload-card[data-type="${type}"]`);
    uploadCard?.classList.add('uploading');
    if(bar) bar.style.width = '0%';

    for (let file of files) {
        const fileRef = storageRef(storage, `${type}/${currentUser.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if(bar) bar.style.width = progress + '%';
            },
            (error) => {
                console.error("Upload failed:", error);
                showToast("Upload failed.", "error");
                uploadCard?.classList.remove('uploading');
                if(bar) bar.style.width = '0%';
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                
                // Placeholder Location Logic (Replace with real GeoLocation API for true location)
                let lat = 34.0522 + (Math.random() - 0.5) * 0.1; // LA-area placeholder
                let lng = -118.2437 + (Math.random() - 0.5) * 0.1;

                await addDoc(collections[type], {
                    url: downloadURL,
                    type,
                    user: USER_MAP[currentUser.email],
                    timestamp: serverTimestamp(),
                    lat: lat,
                    lng: lng,
                    caption: file.name // Use filename as default caption
                });
                
                addToTimeline(`Uploaded a ${type.slice(0,-1)}`);
                showToast(`Media upload complete!`, "success"); // Toast per file

            }
        );
    }
    
    // Final UI cleanup after all files are done
    uploadCard?.classList.remove('uploading');
    setTimeout(() => { if(bar) bar.style.width = '0%'; }, 1000);
}

function renderGallery(type) {
    const container = type === 'photos' ? galleryPhotoContainer : galleryVideoContainer;
    if (!container) return;

    onSnapshot(query(collections[type], orderBy('timestamp', 'desc'), limit(50)), snap => {
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const element = document.createElement('div');
            element.classList.add('gallery-item');
            
            const isVideo = type === 'videos';

            if (isVideo) {
                element.innerHTML = `<video src="${data.url}" muted preload="metadata"></video><span class="video-overlay">▶</span>`;
            } else {
                element.style.backgroundImage = `url(${data.url})`;
            }
            
            element.addEventListener('click', () => openLightbox(data.url, data.caption || 'No Caption', type));
            container.appendChild(element);
        });
    });
}

/* ================= MAP & MEMORIES (Requires Leaflet JS/CSS) ================= */
function initMap() {
    const container = document.getElementById('mapContainer');
    if (!container) return;
    if (!mapInstance) {
        // Initialize Leaflet map centered near LA (default center)
        mapInstance = L.map('mapContainer').setView([34.0522, -118.2437], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);
        
        // Add click listener for coordinate input (for memory modal)
        mapInstance.on('click', (e) => {
            document.getElementById('latInput').value = e.latlng.lat.toFixed(6);
            document.getElementById('lngInput').value = e.latlng.lng.toFixed(6);
        });

        renderMapPoints();
        renderMediaLocations();
    } else {
        mapInstance.invalidateSize(); // Fix map rendering issues after tab switch
    }
}

// Memory Modal Handlers
document.getElementById('addMemoryBtn')?.addEventListener('click', () => document.getElementById('memoryModal').classList.add('active'));
document.getElementById('cancelMemoryBtn')?.addEventListener('click', () => document.getElementById('memoryModal').classList.remove('active'));

document.getElementById('saveMemoryBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('memoryTitle').value;
    const desc = document.getElementById('memoryDesc').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    
    if (!title || isNaN(lat) || isNaN(lng)) {
        showToast("Title and valid coordinates are required.", "error");
        return;
    }
    
    try {
        await addDoc(collections.memories, {
            title, desc, lat, lng,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
        showToast("Memory pinned!", "success");
        document.getElementById('memoryModal').classList.remove('active');
        addToTimeline(`Pinned a new memory: ${title}`);
    } catch(e) {
        showToast("Failed to pin memory.", "error");
    }
});

function renderMapPoints() {
    memoryMarkers.forEach(m => mapInstance?.removeLayer(m));
    memoryMarkers = [];
    
    onSnapshot(query(collections.memories, orderBy('timestamp', 'desc')), snap => {
        if (!mapInstance) return;
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const marker = L.marker([data.lat, data.lng]).addTo(mapInstance)
                .bindPopup(`<b>${escapeHtml(data.title)}</b><br>${escapeHtml(data.desc || '')}`);
            memoryMarkers.push(marker);
        });
    });
}

function renderMediaLocations() {
    // This is simplified to just add a few media items; for a large app, this needs optimization.
    // It listens to both photo and video collections.
    mediaMarkers.forEach(m => mapInstance?.removeLayer(m));
    mediaMarkers = [];

    const mediaQueries = [
        query(collections.photos, orderBy('timestamp', 'desc'), limit(15)),
        query(collections.videos, orderBy('timestamp', 'desc'), limit(5))
    ];

    mediaQueries.forEach(q => {
        onSnapshot(q, snap => {
            if (!mapInstance) return;
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if(data.lat && data.lng) {
                    const iconType = data.type === 'photos' ? '📸' : '🎬';
                    const marker = L.marker([data.lat, data.lng], {
                        icon: L.divIcon({
                            className: 'custom-map-icon',
                            html: `<div class="media-map-pin">${iconType}</div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 30]
                        })
                    }).addTo(mapInstance)
                    .bindPopup(`
                        <b>${data.type.slice(0,-1)} by ${escapeHtml(data.user)}</b><br>
                        ${data.type === 'photos' ? `<img src="${data.url}" style="max-width:100px; max-height:100px; border-radius: 8px;">` : `<video src="${data.url}" controls style="max-width:150px; border-radius: 8px;"></video>`}
                    `);
                    mediaMarkers.push(marker);
                }
            });
        });
    });
}

/* ================= MUSIC, FAVORITES, LIGHTBOX ================= */
function renderMusic() {
    const list = document.getElementById('musicContainer');
    if (!list) return;
    onSnapshot(query(collections.music, orderBy('timestamp', 'desc'), limit(10)), snap => {
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const item = document.createElement('div');
            item.classList.add('music-item', 'card');
            item.innerHTML = `
                <div class="track-info">
                    <h5>🎶 ${escapeHtml(data.title)}</h5>
                    <p>${escapeHtml(data.artist)}</p>
                </div>
                <button class="btn icon"><i class="fa-solid fa-play"></i></button>
            `;
            list.appendChild(item);
        });
    });
}

document.getElementById('saveFavoriteBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('favTitle').value;
    const link = document.getElementById('favLink').value;
    const notes = document.getElementById('favNotes').value;
    
    if (!title) { showToast("A title is required for a favorite.", "error"); return; }
    
    try {
        await addDoc(collections.favorites, {
            title, link, notes,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
        
        document.getElementById('favTitle').value = '';
        document.getElementById('favLink').value = '';
        document.getElementById('favNotes').value = '';
        showToast("Favorite added!", "success");
        addToTimeline(`Added a new favorite: ${title}`);
    } catch(e) {
        showToast("Failed to add favorite.", "error");
    }
});

function renderFavorites() {
    const list = document.getElementById('favoritesContainer');
    if (!list) return;
    onSnapshot(query(collections.favorites, orderBy('timestamp', 'desc'), limit(15)), snap => {
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const item = document.createElement('a');
            item.classList.add('favorite-link');
            if (data.link) item.href = data.link;
            item.target = '_blank';
            item.innerHTML = `<div class="icon-circle card">⭐️</div><p>${escapeHtml(data.title)}</p>`;
            list.appendChild(item);
        });
    });
}

const lightbox = document.getElementById('lightbox');
const lightboxMediaContainer = document.getElementById('lightboxContainer'); // Fixed ID
const lightboxCaption = document.getElementById('lightboxCaption');
const closeLightboxBtn = document.querySelector('.close-lightbox');

function openLightbox(url, caption, type) {
    if (!lightbox || !lightboxMediaContainer) return;
    
    lightboxMediaContainer.innerHTML = '';
    let media;

    if (type === 'videos') {
        media = document.createElement('video');
        media.src = url;
        media.controls = true;
        media.autoplay = true;
    } else {
        media = document.createElement('div');
        media.style.backgroundImage = `url(${url})`;
    }
    
    media.classList.add('lightbox-media');
    lightboxMediaContainer.appendChild(media);
    lightboxCaption.textContent = caption;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    if(!lightbox) return;
    lightbox.classList.remove('active');
    lightboxMediaContainer.innerHTML = '';
    lightboxCaption.textContent = '';
    document.body.style.overflow = '';
}

closeLightboxBtn?.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && lightbox.classList.contains('active')) closeLightbox();
});


/* ================= INIT ================= */
// Attach tab-switching logic for dynamic content loading
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetSectionId = e.currentTarget.dataset.section;
        
        // Tab switching logic (assuming you handle section visibility in your CSS/HTML)
        document.querySelectorAll('.container .section').forEach(s => s.classList.remove('active'));
        document.getElementById(targetSectionId)?.classList.add('active');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Special initialization for the map when its tab is clicked
        if (targetSectionId === 'mapSection') {
            initMap();
        }
    });
});

function initApp() {
    updateTimeTogether();
    renderSavings();
    renderGallery('photos');
    renderGallery('videos');
    renderNotes(); // Handles Timeline/Notes posts
    renderMusic();
    renderFavorites();

    // Theme initialization
    document.getElementById('darkModeToggle')?.addEventListener('change', e => {
        document.body.classList.toggle('dark', e.target.checked);
        localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
    });
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('darkModeToggle').checked = true;
    }
}
