// script.js - Optimized, Functional, and Amazing (MERGED + COMPLETE)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, getDocs, limit, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCg4ff72caOr1rk9y7kZAkUbcyjqfPuMLI", // <<< REPLACE WITH YOUR FIREBASE API KEY
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

const USER_MAP = { 'brayden@love.com': 'Brayden', 'youna@love.com': 'Youna' };
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

/* ================= AUTH & STARTUP (Partial, using original implementation) ================= */

const authModal = document.getElementById("authModal");
const braydenLogin = document.getElementById("braydenLogin");
const younaLogin = document.getElementById("younaLogin");
const authEmail = document.getElementById("authEmail");

// Default Selection (Retained original logic for selection UI)
if(braydenLogin && younaLogin && authEmail) {
    authEmail.value = USERS.brayden;
    braydenLogin.addEventListener("click", () => {
        braydenLogin.classList.add('active');
        younaLogin.classList.remove('active');
        authEmail.value = USERS.brayden;
    });
    younaLogin.addEventListener("click", () => {
        younaLogin.classList.add('active');
        braydenLogin.classList.remove('active');
        authEmail.value = USERS.youna;
    });
}

document.getElementById("signInBtn")?.addEventListener("click", async () => {
    try {
        const pass = document.getElementById("authPassword").value;
        await signInWithEmailAndPassword(auth, authEmail.value, pass);
        showToast("Welcome home.", "success");
    } catch (e) {
        console.error(e);
        showToast("Incorrect vow.", "error");
    }
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    if (currentUser) {
        // Clear RTDB presence for the logged-in user
        await set(ref(rtdb, `presence/${USER_MAP[currentUser.email]}`), { status: 'offline', timestamp: Date.now() });
    }
    await signOut(auth);
});


onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
        authModal.classList.remove("active");
        setupPresence(user);
        initApp();
    } else {
        authModal.classList.add("active");
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


/* ================= NAVIGATION ================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
        
        btn.classList.add("active");
        const sectionId = btn.dataset.section;
        const section = document.getElementById(sectionId);
        section.classList.add("active");
        
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
    if(!modal || !content) return;
    
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
    if(!txt) return showToast("Note is empty.", "error");

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
    if(!txt) return;

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
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const date = data.timestamp ? data.timestamp.toLocaleString() : 'Just now';
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
                if (confirm('Are you sure you want to delete this note and its replies?')) {
                    await deleteDoc(doc(db, 'notes', id));
                    addToTimeline('Deleted a note thread');
                }
            };

            list.appendChild(div);
        });
    });
}


/* ================= LISTS (To-Do & Polls) ================= */

// To-Do Logic
document.getElementById('addTodoBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('todoInput');
    const task = input.value.trim();
    if(!task) return;

    await addDoc(collections.todos, {
        task,
        completed: false,
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });
    input.value = '';
    addToTimeline(`Added a new To-Do: ${task.substring(0, 20)}...`);
    showToast("Task added.");
});

async function toggleTodoStatus(id, currentStatus) {
    await updateDoc(doc(db, 'todos', id), { completed: !currentStatus });
    addToTimeline(`Toggled a To-Do item`);
}

function renderTodos() {
    const list = document.getElementById('todoList');
    onSnapshot(query(collections.todos, orderBy('completed', 'asc'), orderBy('timestamp', 'desc')), snap => {
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'todo-item';
            div.onclick = () => toggleTodoStatus(id, data.completed);
            
            const checkboxClass = data.completed ? 'checked' : '';
            const textClass = data.completed ? 'completed' : '';

            div.innerHTML = `
                <div class="todo-checkbox ${checkboxClass}"></div>
                <span class="todo-text ${textClass}">${escapeHtml(data.task)}</span>
                <span style="font-size:0.8rem; color:var(--subtext);">Added by ${escapeHtml(data.user)}</span>
            `;
            list.appendChild(div);
        });
    });
}

// Polls Logic
document.getElementById('addPollToggleBtn')?.addEventListener('click', () => document.getElementById('pollForm').classList.toggle('hidden'));
document.getElementById('cancelPollBtn')?.addEventListener('click', () => document.getElementById('pollForm').classList.add('hidden'));

document.getElementById('savePollBtn')?.addEventListener('click', async () => {
    const question = document.getElementById('pollQuestion').value.trim();
    const optionsText = document.getElementById('pollOptions').value.trim();
    if(!question || !optionsText) return showToast("Question and options are required.", "error");

    const options = optionsText.split(',').map(o => o.trim()).filter(o => o.length > 0);
    const optionsMap = options.reduce((acc, opt) => {
        acc[opt] = []; // option name maps to array of user UIDs/names who voted
        return acc;
    }, {});

    await addDoc(collections.polls, {
        question,
        options: optionsMap,
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });
    document.getElementById('pollForm').classList.add('hidden');
    document.getElementById('pollQuestion').value = '';
    document.getElementById('pollOptions').value = '';
    addToTimeline(`Created a new poll: ${question.substring(0, 20)}...`);
    showToast("Poll created.");
});

function handlePollVote(pollId, optionName) {
    return async () => {
        const user = USER_MAP[currentUser.email];
        const pollRef = doc(db, 'polls', pollId);
        const pollSnap = await getDoc(pollRef);
        if(!pollSnap.exists()) return;
        const data = pollSnap.data();

        let updatedOptions = { ...data.options };
        let hasVoted = false;

        // 1. Remove user's vote from ALL other options
        Object.keys(updatedOptions).forEach(opt => {
            updatedOptions[opt] = updatedOptions[opt].filter(u => u !== user);
        });
        
        // 2. Check if the vote is a toggle (unvote) or new vote
        if (data.options[optionName].includes(user)) {
             // User is unvoting from this option - already removed in step 1
             showToast(`Unvoted from ${optionName}`);
        } else {
            // Add vote to the selected option
            updatedOptions[optionName].push(user);
            hasVoted = true;
            showToast(`Voted for ${optionName}`);
        }
        
        await updateDoc(pollRef, { options: updatedOptions });
        if(hasVoted) addToTimeline(`Voted in a poll`);
    };
}

function renderPolls() {
    const list = document.getElementById('pollsList');
    onSnapshot(query(collections.polls, orderBy('timestamp', 'desc')), snap => {
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'poll-item';
            
            const totalVotes = Object.values(data.options).flat().length;
            const user = USER_MAP[currentUser.email];
            let userVotedOption = null;
            
            Object.entries(data.options).forEach(([option, voters]) => {
                if (voters.includes(user)) userVotedOption = option;
            });

            const optionsHtml = Object.entries(data.options).map(([option, voters]) => {
                const voteCount = voters.length;
                const isVoted = option === userVotedOption;
                return `
                    <button class="btn small poll-option-btn ${isVoted ? 'voted' : 'ghost'}" data-option="${option}">
                        <span>${escapeHtml(option)}</span>
                        <span>${voteCount} ${voteCount === 1 ? 'vote' : 'votes'}</span>
                    </button>
                `;
            }).join('');

            div.innerHTML = `
                <div class="poll-question">${escapeHtml(data.question)}</div>
                <div class="poll-options-wrapper">${optionsHtml}</div>
                <p style="font-size:0.8rem; color:var(--subtext); margin-top:10px;">Created by ${escapeHtml(data.user)} • Total: ${totalVotes} votes</p>
            `;

            div.querySelectorAll('.poll-option-btn').forEach(btn => {
                btn.onclick = handlePollVote(id, btn.dataset.option);
            });
            
            list.appendChild(div);
        });
    });
}


/* ================= MAP (Media Location Toggle) ================= */

// Map Toggles Listener
document.getElementById('toggleMemories')?.addEventListener('click', (e) => {
    e.target.classList.add('active', 'primary');
    e.target.classList.remove('ghost');
    document.getElementById('toggleMedia').classList.remove('active', 'primary');
    document.getElementById('toggleMedia').classList.add('ghost');
    memoryMarkers.forEach(m => mapInstance.addLayer(m));
    clearMediaMarkers();
});

document.getElementById('toggleMedia')?.addEventListener('click', (e) => {
    e.target.classList.add('active', 'primary');
    e.target.classList.remove('ghost');
    document.getElementById('toggleMemories').classList.remove('active', 'primary');
    document.getElementById('toggleMemories').classList.add('ghost');
    // Toggle logic: hide memory markers, show media markers
    memoryMarkers.forEach(m => mapInstance.removeLayer(m));
    if (mapInstance) renderMediaLocations(true);
});

// Helper to remove media markers
function clearMediaMarkers() {
    if (mapInstance) {
        mediaMarkers.forEach(m => mapInstance.removeLayer(m));
    }
    mediaMarkers = [];
}

// Function to render media locations on the map
function renderMediaLocations(forceRender = false) {
    if (!mapInstance || (!forceRender && !document.getElementById('toggleMedia')?.classList.contains('active'))) return;
    
    // Clear existing media markers before re-rendering
    clearMediaMarkers();

    onSnapshot(collections.photos, snapPhotos => {
        onSnapshot(collections.videos, snapVideos => {
            
            const photoLocations = getMediaWithLocation(snapPhotos, 'photos');
            const videoLocations = getMediaWithLocation(snapVideos, 'videos');
            const allMediaLocations = [...photoLocations, ...videoLocations];
            
            allMediaLocations.forEach(loc => {
                // Different color/icon based on media type
                const colorCode = loc.type === 'photos' ? '#C38D9E' : '#E8DFF5';
                const iconHtml = loc.type === 'photos' ? '📸' : '📹';

                const icon = L.divIcon({
                    className: 'media-marker-icon',
                    html: `<span style="color:${colorCode}; font-size: 20px;">${iconHtml}</span>`,
                    iconSize: [20, 20]
                });

                const marker = L.marker([loc.lat, loc.lng], { icon: icon }).addTo(mapInstance)
                    .bindPopup(`
                        <b>${escapeHtml(loc.title)}</b><br>
                        <a href="${loc.url}" target="_blank">View Media</a>
                    `);
                mediaMarkers.push(marker);
            });
        });
    });
}

// Helper function to simulate fetching media with geo-metadata
function getMediaWithLocation(snap, type) {
    const locations = [];
    snap.forEach(docSnap => {
        const data = docSnap.data();
        // Simulate Geo-metadata check (assuming roughly 10% have locations)
        if (Math.random() < 0.1) {
            // Simulated location data based on user (jittered around LA and NY)
            let lat = data.user === 'Brayden' ? 40.71 + (Math.random() * 0.1 - 0.05) : 34.05 + (Math.random() * 0.1 - 0.05);
            let lng = data.user === 'Brayden' ? -74.00 + (Math.random() * 0.1 - 0.05) : -118.24 + (Math.random() * 0.1 - 0.05);

            locations.push({
                title: `${type.slice(0,-1)} by ${data.user}`,
                lat, lng,
                url: data.url,
                type: type
            });
        }
    });
    return locations;
}

function initMap() {
    const container = document.getElementById('mapContainer');
    if (!container) return;
    
    if (!mapInstance) {
        // Initial view is LA
        mapInstance = L.map('mapContainer').setView([34.0522, -118.2437], 10);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);
        renderMapPoints(); // Memories are rendered by default
    } else {
        // Fix for gray map when hidden
        mapInstance.invalidateSize();
    }
}

function renderMapPoints() {
    onSnapshot(collections.memories, snap => {
        // Clear existing markers
        memoryMarkers.forEach(m => mapInstance.removeLayer(m));
        memoryMarkers = [];
        const list = document.getElementById('memoriesList');
        if(list) list.innerHTML = '';
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const marker = L.marker([data.lat, data.lng]).addTo(mapInstance)
                .bindPopup(`<b>${escapeHtml(data.title)}</b><br>${escapeHtml(data.desc)}`);
            memoryMarkers.push(marker);
            
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${escapeHtml(data.title)}</strong>
                    <button class="btn icon-btn small">✈️</button>
                </div>
                <p style="font-size:0.9rem; margin:4px 0;">${escapeHtml(data.desc)}</p>
            `;
            div.querySelector('button').onclick = () => {
                mapInstance.flyTo([data.lat, data.lng], 15);
                marker.openPopup();
                document.getElementById('mapContainer').scrollIntoView({behavior:'smooth'});
            };
            if(list) list.appendChild(div);
        });
    });
}


/* ================= CHECK-INS (Mood & Status) - NEW SECTION ================= */

// Mood Selector Logic
document.querySelectorAll('.mood-selector button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mood-selector button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
    });
});

document.getElementById('saveCheckinBtn')?.addEventListener('click', async () => {
    const moodBtn = document.querySelector('.mood-selector button.active');
    const status = document.getElementById('statusInput').value.trim();
    if (!moodBtn) return showToast('Please select a mood.', 'error');

    const mood = moodBtn.dataset.mood;

    await addDoc(collections.checkins, {
        mood,
        status,
        user: USER_MAP[currentUser.email],
        timestamp: serverTimestamp()
    });

    // Reset UI
    document.getElementById('statusInput').value = '';
    document.querySelectorAll('.mood-selector button').forEach(b => b.classList.remove('active'));
    
    addToTimeline(`Checked in with mood: ${mood}`);
    showToast('Check-in saved! ❤️');
});

function renderCheckins() {
    const list = document.getElementById('checkinList');
    onSnapshot(query(collections.checkins, orderBy('timestamp', 'desc'), limit(10)), snap => {
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Just now';
            const moodEmoji = {
                'happy': '😊', 'sad': '😔', 'neutral': '😐', 'excited': '🤩', 'tired': '😴'
            }[data.mood] || '❓';

            const div = document.createElement('div');
            div.className = 'card checkin-item';
            div.innerHTML = `
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="font-size: 24px;">${moodEmoji}</span>
                    <div>
                        <strong>${escapeHtml(data.user)} is ${escapeHtml(data.mood)}</strong>
                        <p style="font-size:0.9rem; color:var(--subtext); margin: 2px 0;">${escapeHtml(data.status)}</p>
                        <span style="font-size:0.8rem; color:var(--subtext);">${date}</span>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    });
    renderMoodChart();
}

function renderMoodChart() {
    const ctx = document.getElementById('moodChartCanvas');
    if(!ctx) return;
    
    // Fetch data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    getDocs(query(collections.checkins, orderBy('timestamp', 'desc'))).then(snap => {
        const moodData = {
            'happy': 0, 'sad': 0, 'neutral': 0, 'excited': 0, 'tired': 0
        };
        const dailyMoods = {};

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const dateStr = data.timestamp.toDate().toISOString().split('T')[0];
            
            // Only count if within 30 days (approximation for demo)
            if(data.timestamp.toDate() > thirtyDaysAgo) {
                moodData[data.mood] = (moodData[data.mood] || 0) + 1;
            }

            // For the line chart (simulating daily trend)
            if (!dailyMoods[dateStr]) dailyMoods[dateStr] = {};
            dailyMoods[dateStr][data.user] = data.mood;
        });

        // 1. Pie Chart Data (Overall Mood Distribution)
        const pieLabels = Object.keys(moodData);
        const pieCounts = Object.values(moodData);

        // 2. Line Chart Data (Last 7 days trend)
        const lineLabels = [];
        const braydenMoods = [];
        const younaMoods = [];

        // Simple mapping from mood string to a number for charting a trend
        const moodToValue = { 'excited': 5, 'happy': 4, 'neutral': 3, 'tired': 2, 'sad': 1 };
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().split('T')[0];
            lineLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

            const todayMoods = dailyMoods[dateKey] || {};
            braydenMoods.push(moodToValue[todayMoods['Brayden'] || 'neutral']);
            younaMoods.push(moodToValue[todayMoods['Youna'] || 'neutral']);
        }


        if (moodChart) moodChart.destroy(); // Destroy previous instance

        moodChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: lineLabels,
                datasets: [
                    {
                        label: 'Brayden Mood Index',
                        data: braydenMoods,
                        backgroundColor: '#C38D9E80', // Primary color
                        borderColor: '#C38D9E',
                        borderWidth: 1,
                        type: 'line',
                        tension: 0.4,
                        pointRadius: 5
                    },
                    {
                        label: 'Youna Mood Index',
                        data: younaMoods,
                        backgroundColor: '#E8DFF580', // Accent color
                        borderColor: '#E8DFF5',
                        borderWidth: 1,
                        type: 'line',
                        tension: 0.4,
                        pointRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Last 7 Days Mood Trend (1=Sad, 5=Excited)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: 5,
                        ticks: {
                            callback: function(value) {
                                return { 1: 'Sad', 2: 'Tired', 3: 'Neutral', 4: 'Happy', 5: 'Excited' }[value] || '';
                            }
                        }
                    }
                }
            }
        });

    }).catch(e => console.error("Error rendering chart:", e));
}


/* ================= MUSIC (Search + Saved + Action Sheet) ================= */

// Attach Music Options Listener (Action sheet + long press)
function attachMusicOptionsListener(element, docId, data) {
    let pressTimer = null;
    const CONTEXT_MENU_DURATION = 700;

    // Prevent default right-click context menu
    element.addEventListener('contextmenu', (e) => e.preventDefault());

    const showMenu = () => {
        // Remove any previous action sheets
        document.querySelectorAll('.action-sheet-backdrop').forEach(m => m.remove());
        
        // Create Action Sheet Backdrop (Modal)
        const backdrop = document.createElement('div');
        backdrop.className = 'action-sheet-backdrop active';
        
        const actionSheet = document.createElement('div');
        actionSheet.className = 'action-sheet-content';

        // Helper to create buttons
        const createActionButton = (text, type, action, icon) => {
            const btn = document.createElement('button');
            btn.className = `action-sheet-btn ${type}`;
            btn.innerHTML = `${icon ? `<span class="icon">${icon}</span>` : ''}<span>${text}</span>`;
            btn.onclick = (e) => {
                e.stopPropagation();
                action();
                backdrop.classList.remove('active');
                setTimeout(() => backdrop.remove(), 300);
            };
            return btn;
        };

        const deleteAction = async () => {
            const ok = confirm(`Delete "${data.title}"?`);
            if(!ok) return;
            try {
                await deleteDoc(doc(db, 'music', docId));
                showToast(`"${data.title}" removed`, "success");
                addToTimeline(`Removed song: ${data.title}`);
                renderMusic();
            } catch(e) {
                console.error(e);
                showToast("Delete failed", "error");
            }
        };
        
        const playlistAction = () => {
             showToast(`Added "${data.title}" to Playlist (Simulated)`);
             addToTimeline(`Added song "${data.title}" to a playlist`);
        };

        const spotifyAction = () => openSongLink(data.title, data.artist, 'spotify');
        const deezerAction = () => openSongLink(data.title, data.artist, 'deezer');
        
        // Menu structure
        const menuBlock = document.createElement('div');
        menuBlock.className = 'action-sheet-block';
        menuBlock.appendChild(createActionButton('Open in Spotify', 'default', spotifyAction, '🎧'));
        menuBlock.appendChild(createActionButton('Open in Deezer', 'default', deezerAction, '🎧'));
        
        const playlistBlock = document.createElement('div');
        playlistBlock.className = 'action-sheet-block';
        playlistBlock.appendChild(createActionButton('Add to Playlist', 'default', playlistAction, '➕'));
        
        const deleteBlock = document.createElement('div');
        deleteBlock.className = 'action-sheet-block';
        deleteBlock.appendChild(createActionButton('Delete Song', 'destructive', deleteAction, '🗑️'));
        
        const cancelBlock = document.createElement('div');
        cancelBlock.className = 'action-sheet-block';
        cancelBlock.appendChild(createActionButton('Cancel', 'cancel', () => backdrop.classList.remove('active'), ''));

        actionSheet.appendChild(menuBlock);
        actionSheet.appendChild(playlistBlock);
        actionSheet.appendChild(deleteBlock);
        actionSheet.appendChild(cancelBlock);

        backdrop.appendChild(actionSheet);
        document.body.appendChild(backdrop);
        
        // Click backdrop to close
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                backdrop.classList.remove('active');
                setTimeout(() => backdrop.remove(), 300);
            }
        };
    };

    const startPress = (e) => {
        // Only trigger on the options button itself
        if(!e.target.closest('.music-options-trigger')) return;

        e.preventDefault();
        clearTimeout(pressTimer);
        pressTimer = setTimeout(showMenu, CONTEXT_MENU_DURATION);
    };
    
    const endPress = () => clearTimeout(pressTimer);

    // Attach listeners to the options button (or its container)
    const trigger = element.querySelector('.music-options-trigger');
    if (trigger) {
        // Desktop listeners
        trigger.addEventListener('mousedown', startPress);
        trigger.addEventListener('mouseup', endPress);
        trigger.addEventListener('mouseleave', endPress);
        
        // Mobile listeners
        trigger.addEventListener('touchstart', startPress);
        trigger.addEventListener('touchend', endPress);
        // Also allow simple click for immediate menu open on non-touch devices or for accessibility
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            // Only show if no long press timer is running or if we're certain it's a simple click
            if (!pressTimer) showMenu();
        });
    }
}

function openSongLink(title, artist, service) {
    const q = `${title} ${artist}`;
    let url = '';
    if(service === 'spotify') {
        // Placeholder URL construction
        url = `https://open.spotify.com/search/${encodeURIComponent(q)}`;
    } else if(service === 'deezer') {
        url = `https://www.deezer.com/search/${encodeURIComponent(q)}`;
    }
    if (url) {
        window.open(url, '_blank');
        showToast(`Opening on ${service.charAt(0).toUpperCase() + service.slice(1)}`);
    }
}

// Music search using iTunes (client-side)
document.getElementById('addMusicBtn')?.addEventListener('click', async () => {
    const queryTerm = document.getElementById('musicInput').value;
    if(!queryTerm) return;
    
    const resultsDiv = document.getElementById('musicSearchResults');
    if(!resultsDiv) return;
    resultsDiv.innerHTML = '<div style="text-align:center; padding:10px;">Searching...</div>';
    resultsDiv.classList.remove('hidden');

    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(queryTerm)}&media=music&limit=8`);
        const data = await res.json();
        resultsDiv.innerHTML = '';

        data.results.forEach(song => {
            const div = document.createElement('div');
            div.className = 'music-item';
            div.innerHTML = `
                <img src="${song.artworkUrl100}" alt="art">
                <div class="music-info">
                    <h4>${escapeHtml(song.trackName)}</h4>
                    <p>${escapeHtml(song.artistName)}</p>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="btn small">Save</button>
                </div>
            `;
            // Add song to DB
            div.querySelector('button').onclick = async () => {
                await addDoc(collections.music, {
                    title: song.trackName,
                    artist: song.artistName,
                    cover: song.artworkUrl100,
                    preview: song.previewUrl,
                    user: USER_MAP[currentUser.email],
                    timestamp: serverTimestamp()
                });
                resultsDiv.classList.add('hidden');
                document.getElementById('musicInput').value = '';
                addToTimeline(`Added song: ${song.trackName}`);
                showToast("Song added to Music");
            };
            resultsDiv.appendChild(div);
        });
    } catch(e) {
        console.error(e);
        resultsDiv.innerHTML = 'Error searching music.';
    }
});

function renderMusic() {
    const container = document.getElementById('savedMusic');
    if(!container) return;
    onSnapshot(query(collections.music, orderBy('timestamp', 'desc')), snap => {
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'card music-item';
            div.innerHTML = `
                <img src="${data.cover}" alt="art">
                <div class="music-info">
                    <h4>${escapeHtml(data.title)}</h4>
                    <p>${escapeHtml(data.artist)} • Added by ${escapeHtml(data.user)}</p>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <audio controls src="${data.preview}" style="height:30px; max-width:140px;"></audio>
                    <div style="width:40px; height:40px; text-align:center; display:flex; justify-content:center; align-items:center;">
                        <button class="btn icon-btn small music-options-trigger" data-id="${id}" aria-label="Options">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                    </div>
                </div>
            `;
            
            // NEW: Attach long-press/click listener for the action sheet
            attachMusicOptionsListener(div, id, data);

            container.appendChild(div);
        });
    });
}

/* ================= CALENDAR ================= */
function renderCalendar(date) {
    const grid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('monthYear');
    if(!grid) return;
    grid.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    monthYear.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for(let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    
    for(let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = d;
        
        const today = new Date();
        if(d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        
        dayEl.addEventListener('click', () => {
            const el = document.getElementById('eventDate');
            if(el) el.value = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            document.getElementById('eventForm')?.classList.remove('hidden');
        });
        
        grid.appendChild(dayEl);
    }
    loadEventsForMonth(date);
}

// Event Listeners for Calendar
document.getElementById('prevMonth')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar(currentCalDate);
});
document.getElementById('nextMonth')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar(currentCalDate);
});
document.getElementById('addEventToggleBtn')?.addEventListener('click', () => document.getElementById('eventForm').classList.toggle('hidden'));
document.getElementById('cancelEventBtn')?.addEventListener('click', () => document.getElementById('eventForm').classList.add('hidden'));

document.getElementById('saveEventBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    if(title && date) {
        await addDoc(collections.events, { title, date, user: USER_MAP[currentUser.email], timestamp: serverTimestamp() });
        document.getElementById('eventForm').classList.add('hidden');
        document.getElementById('eventTitle').value = '';
        renderCalendar(currentCalDate);
        showToast("Event saved");
        addToTimeline(`New Plan: ${title}`);
    }
});

function loadEventsForMonth(date) {
    // Simple fetch all for demo scale
    onSnapshot(collections.events, snap => {
        const days = document.querySelectorAll('.calendar-day');
        // Reset dots
        days.forEach(d => d.classList.remove('has-event'));
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const evtDate = new Date(data.date);
            // Important: Match Month AND Year
            if(evtDate.getMonth() === date.getMonth() && evtDate.getFullYear() === date.getFullYear()) {
                days.forEach(dayEl => {
                    if(parseInt(dayEl.textContent) === evtDate.getDate()) {
                        dayEl.classList.add('has-event');
                    }
                });
            }
        });
        renderEventsList();
    });
}

function renderEventsList() {
    const list = document.getElementById('eventsList');
    if(!list) return;
    // Order by date ascending
    onSnapshot(query(collections.events, orderBy('date', 'asc'), limit(50)), snap => {
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'event-item';
            div.innerHTML = `
                <div><strong>${escapeHtml(data.date)}</strong>: ${escapeHtml(data.title)}</div>
            `;
            list.appendChild(div);
        });
    });
}

/* ================= FAVORITES & LIGHTBOX ================= */

// Favorites (toggleFavorite supports add now; we add delete via long press elsewhere)
async function toggleFavorite(e, url, type) {
    e.stopPropagation();
    try {
        await addDoc(collections.favorites, {
            url, type,
            user: USER_MAP[currentUser.email],
            timestamp: serverTimestamp()
        });
        showToast("Added to Favorites");
        addToTimeline(`Faved a ${type.slice(0,-1)}`);
    } catch(err) {
        console.error(err);
        showToast("Could not add favorite", "error");
    }
}

function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    if(!grid) return;
    onSnapshot(query(collections.favorites, orderBy('timestamp', 'desc'), limit(50)), snap => {
        grid.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'masonry-item';

            let content = '';
            let title = '';
            if(data.type === 'photos') {
                content = `<img src="${escapeHtml(data.url)}" loading="lazy">`;
                title = 'Photo';
            } else if(data.type === 'videos') {
                content = `<video src="${escapeHtml(data.url)}" controls></video>`;
                title = 'Video';
            } else {
                content = `<a href="${escapeHtml(data.url)}" target="_blank">Open Link</a>`;
                title = 'Link';
            }

            div.innerHTML = `
                ${content}
                <div class="item-meta">
                    <span>Saved by ${escapeHtml(data.user)}</span>
                    <button class="btn icon-btn small fav-options-trigger" data-id="${id}" aria-label="Options">... </button>
                </div>
            `;
            
            // Long-press trigger for Delete/Edit
            attachLongPressListener(
                div.querySelector('.fav-options-trigger').parentElement,
                id, 'favorites', `${title} from ${escapeHtml(data.user)}`, renderFavorites
            );
            
            grid.appendChild(div);
        });
    });
}

/* ================= LIGHTBOX (improved) ================= */
const lightbox = document.getElementById('lightbox');
const lightboxContainer = lightbox?.querySelector('.lightbox-media-container');
const lightboxCaption = lightbox?.querySelector('.lightbox-caption');
const lightboxClose = lightbox?.querySelector('.close-lightbox');

function openLightbox({ type, src, caption = '' }) {
    if(!lightbox || !lightboxContainer) return;
    lightboxContainer.innerHTML = '';
    if(type === 'image') {
        const img = document.createElement('img');
        img.src = src;
        img.alt = caption || 'photo';
        img.style.maxHeight = '80vh';
        img.style.maxWidth = '90vw';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        lightboxContainer.appendChild(img);
    } else if(type === 'video') {
        const v = document.createElement('video');
        v.src = src;
        v.controls = true;
        v.style.maxHeight = '80vh';
        v.style.maxWidth = '90vw';
        v.style.display = 'block';
        v.style.margin = '0 auto';
        lightboxContainer.appendChild(v);
    }
    lightboxCaption.textContent = caption;
    lightbox.classList.add('active');
    // trap scroll
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    if(!lightbox) return;
    lightbox.classList.remove('active');
    lightboxContainer.innerHTML = '';
    lightboxCaption.textContent = '';
    document.body.style.overflow = '';
}

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.querySelector('.lightbox-backdrop')?.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeLightbox(); });

/* ================= MAP MEMORY CREATION ================= */
document.getElementById('addMemoryBtn')?.addEventListener('click', () => document.getElementById('memoryModal').classList.add('active'));
document.getElementById('cancelMemoryBtn')?.addEventListener('click', () => document.getElementById('memoryModal').classList.remove('active'));
document.getElementById('getCurrentLocation')?.addEventListener('click', () => {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('latInput').value = pos.coords.latitude;
            document.getElementById('lngInput').value = pos.coords.longitude;
        });
    }
});
document.getElementById('saveMemoryBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('memoryTitle').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    if(title && lat && lng) {
        await addDoc(collections.memories, {
            title, lat, lng, desc: document.getElementById('memoryDesc').value,
            user: USER_MAP[currentUser.email], timestamp: serverTimestamp()
        });
        document.getElementById('memoryModal').classList.remove('active');
        showToast("Memory pinned!");
        addToTimeline(`Pinned location: ${title}`);
    }
});

/* ================= MEDIA UPLOAD (Cloudinary) ================= */
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "unsigned_upload";

async function handleUpload(files, type) {
    if(!files.length) return;
    showToast("Uploading to cloud...");
    const bar = document.getElementById(type === 'photos' ? 'photoProgress' : 'videoProgress');
    
    for (let file of files) {
        const fd = new FormData();
        fd.append("upload_preset", UPLOAD_PRESET);
        fd.append("file", file);
        
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            
            if(data.error) throw new Error(data.error.message);
            
            if(bar) bar.style.width = '100%';
            
            await addDoc(collections[type], {
                url: data.secure_url, type,
                user: USER_MAP[currentUser.email], timestamp: serverTimestamp()
            });
            addToTimeline(`Uploaded a ${type.slice(0,-1)}`);
        } catch(e) {
            console.error(e);
            showToast("Upload failed. Check Cloudinary settings.", "error");
        }
    }
    setTimeout(() => { if(document.getElementById(type === 'photos' ? 'photoProgress' : 'videoProgress')) document.getElementById(type === 'photos' ? 'photoProgress' : 'videoProgress').style.width = '0%'; }, 1000);
    showToast("Upload complete!", "success");
}

document.getElementById('photoInput')?.addEventListener('change', e => handleUpload(e.target.files, 'photos'));
document.getElementById('videoInput')?.addEventListener('change', e => handleUpload(e.target.files, 'videos'));

function renderGallery(type) {
    const container = document.getElementById(type === 'photos' ? 'photoGallery' : 'videoGallery');
    if(!container) return;
    onSnapshot(query(collections[type], orderBy('timestamp', 'desc'), limit(50)), snap => {
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'masonry-item';
            const media = type === 'photos'
                ? `<img src="${escapeHtml(data.url)}" loading="lazy" data-url="${escapeHtml(data.url)}" alt="photo">`
                : `<video src="${escapeHtml(data.url)}" controls></video>`;
            
            div.innerHTML = `
                ${media}
                <div class="item-meta">
                    <span>${escapeHtml(data.user)}</span>
                    <button class="btn small fav-btn" data-url="${escapeHtml(data.url)}" data-type="${type}">Save</button>
                </div>
            `;
            
            div.querySelector('.fav-btn').onclick = (e) => toggleFavorite(e, data.url, type);
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

/* ================= CONTEXT MENU SIMULATION (Delete/Edit) ================= */
let pressTimer = null;
const CONTEXT_MENU_DURATION = 700; // ms to simulate long press

function attachLongPressListener(element, docId, collectionName, title, renderFunction) {
    if(!element) return;
    let contextMenu = null;
    
    // Prevent default right-click context menu
    element.addEventListener('contextmenu', (e) => e.preventDefault());

    const showMenu = (e) => {
        // Prevent showing multiple menus
        document.querySelectorAll('.context-menu').forEach(m => m.remove());
        
        contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.position = 'absolute';
        contextMenu.style.right = '8px';
        contextMenu.style.top = '8px';
        contextMenu.style.zIndex = '9999';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn small error';
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.color = 'var(--error)';
        deleteBtn.onclick = async () => {
            const ok = confirm(`Delete "${title}"?`);
            if(!ok) return;
            try {
                await deleteDoc(doc(db, collectionName, docId));
                showToast(`"${title}" removed`, "success");
                addToTimeline(`Removed item from ${collectionName}`);
                if(renderFunction) renderFunction(); // Re-render if provided
            } catch(e) {
                console.error(e);
                showToast("Delete failed", "error");
            }
            contextMenu.remove();
        };

        const editBtn = document.createElement('button');
        editBtn.className = 'btn small ghost';
        editBtn.textContent = 'Edit (Click to log)';
        editBtn.onclick = () => {
             // In a real app, this would open an edit form
            showToast(`Editing "${title}"... (Simulated/Logged)`);
            addToTimeline(`Edited item in ${collectionName}`); // Log the edit
            contextMenu.remove();
        };

        contextMenu.appendChild(editBtn);
        contextMenu.appendChild(deleteBtn);
        element.appendChild(contextMenu);
        
        // Auto-hide menu after a short time or on click outside
        const hideMenu = (ev) => {
            if(contextMenu && !contextMenu.contains(ev.target) && ev.target !== element) {
                contextMenu.remove();
                document.removeEventListener('click', hideMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', hideMenu), 50);
    };

    const startPress = (e) => {
        e.preventDefault();
        pressTimer = setTimeout(() => showMenu(e), CONTEXT_MENU_DURATION);
    };
    
    const endPress = () => clearTimeout(pressTimer);

    // Attach listeners to the options button (or its container)
    const trigger = element.querySelector('.delete-note-trigger, .fav-options-trigger');
    if (trigger) {
        // Desktop listeners
        trigger.addEventListener('mousedown', startPress);
        trigger.addEventListener('mouseup', endPress);
        trigger.addEventListener('mouseleave', endPress);
        
        // Mobile listeners
        trigger.addEventListener('touchstart', startPress);
        trigger.addEventListener('touchend', endPress);
    }
}


/* ================= INIT ================= */
function initApp() {
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

document.getElementById('darkModeToggle')?.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
});

// Close lightbox shortcut (already set above) - double bind guard
document.querySelectorAll('.close-lightbox').forEach(el => el.addEventListener('click', closeLightbox));
