// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCg4ff72caOr1rk9y7kZAkUbcyjqfPuMLI",
  authDomain: "ourwebsite223.firebaseapp.com",
  projectId: "ourwebsite223",
  storageBucket: "ourwebsite223.firebasestorage.app",
  messagingSenderId: "978864749848",
  appId: "1:978864749848:web:f1e635f87e2ddcc007f26d",
  measurementId: "G-823MYFCCMG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded! Initializing app..."); // Debug: Check if this logs

  // ----------------- SECTION NAVIGATION -----------------
  const sections = document.querySelectorAll(".section");
  const navButtons = document.querySelectorAll("nav button");

  console.log(`Found ${sections.length} sections and ${navButtons.length} buttons`); // Debug

  function showSection(id) {
    console.log(`Switching to section: ${id}`); // Debug
    sections.forEach(s => s.classList.remove("active"));
    const section = document.getElementById(id);
    if(section) section.classList.add("active");
    navButtons.forEach(btn => btn.classList.remove("active"));
    const activeBtn = Array.from(navButtons).find(btn => btn.dataset.section === id);
    if(activeBtn) activeBtn.classList.add("active");
  }

  // Show default section
  showSection("photos");

  // Add click listeners to nav buttons
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      console.log(`Button clicked: ${btn.dataset.section}`); // Debug
      const target = btn.dataset.section;
      showSection(target);
    });
  });

  console.log("Navigation listeners attached!"); // Debug

  // ----------------- COLLECTIONS -----------------
  const photosCollection = collection(db, "photos");
  const videosCollection = collection(db, "videos");
  const musicCollection = collection(db, "music");
  const notesCollection = collection(db, "notes");
  const timelineCollection = collection(db, "timeline");

  // ----------------- TIMELINE -----------------
  const timelineList = document.getElementById("timelineList");
  function addToTimeline(action) {
    addDoc(timelineCollection, { action, timestamp: new Date() });
  }

  function renderTimeline() {
    const q = query(timelineCollection, orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
      timelineList.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "timelineItem";
        div.innerHTML = `<strong>${data.timestamp.toDate().toLocaleString()}</strong><br>${data.action}`;
        timelineList.appendChild(div);
      });
    });
  }

  // ----------------- PHOTOS -----------------
  const photoInput = document.getElementById("photoInput");
  const photoGallery = document.getElementById("photoGallery");

  const photosQ = query(photosCollection, orderBy("timestamp", "desc"));
  onSnapshot(photosQ, (snapshot) => {
    photoGallery.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const img = document.createElement("img");
      img.src = data.url;
      img.alt = "Cherished photo";
      photoGallery.appendChild(img);
    });
  });

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    if(!file) return;

    const uniqueName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `photos/${uniqueName}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(photosCollection, { url, timestamp: new Date() });
    addToTimeline("Photo added 💖");
    photoInput.value = "";
  });

  // ----------------- VIDEOS -----------------
  const videoInput = document.getElementById("videoInput");
  const videoGallery = document.getElementById("videoGallery");

  const videosQ = query(videosCollection, orderBy("timestamp", "desc"));
  onSnapshot(videosQ, (snapshot) => {
    videoGallery.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const video = document.createElement("video");
      video.src = data.url;
      video.controls = true;
      videoGallery.appendChild(video);
    });
  });

  videoInput.addEventListener("change", async () => {
    const file = videoInput.files[0];
    if(!file) return;

    const uniqueName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `videos/${uniqueName}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(videosCollection, { url, timestamp: new Date() });
    addToTimeline("Video added 🎥");
    videoInput.value = "";
  });

  // ----------------- NOTES -----------------
  const saveNoteBtn = document.getElementById("saveNoteBtn");
  const noteInput = document.getElementById("noteInput");

  saveNoteBtn.addEventListener("click", async () => {
    const text = noteInput.value.trim();
    if(!text) return;

    await addDoc(notesCollection, { text, timestamp: new Date() });
    noteInput.value = "";
    addToTimeline("Note added ✍️");
  });

  function renderNotes() {
    const q = query(notesCollection, orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
      const notesList = document.getElementById("notesList");
      notesList.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "noteItem";
        div.innerHTML = `<strong>${data.timestamp.toDate().toLocaleString()}</strong><br><em>${data.text}</em>`;
        notesList.appendChild(div);
      });
    });
  }

  // ----------------- MUSIC -----------------
  const musicInput = document.getElementById("musicInput");
  const addMusicBtn = document.getElementById("addMusicBtn");
  const searchResults = document.getElementById("searchResults");
  const savedMusic = document.getElementById("savedMusic");

  function renderSavedMusic() {
    const q = query(musicCollection, orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
      savedMusic.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "musicItem";

        const img = document.createElement("img");
        img.src = data.cover || "https://via.placeholder.com/60?text=🎵";
        img.alt = "Album cover";

        const info = document.createElement("div");
        const titleP = document.createElement("p");
        titleP.textContent = data.title;
        const artistP = document.createElement("p");
        artistP.textContent = data.artist;
        const timeP = document.createElement("p");
        timeP.textContent = `Added: ${data.timestamp.toDate().toLocaleDateString()}`;
        timeP.style.fontSize = "0.8em";
        timeP.style.color = "#666";
        timeP.style.margin = "5px 0 0 0";

        if (data.preview) {
          const audio = document.createElement("audio");
          audio.src = data.preview;
          audio.controls = true;
          info.appendChild(audio);
        }

        const spotifyLink = document.createElement("a");
        spotifyLink.href = data.url;
        spotifyLink.target = "_blank";
        spotifyLink.textContent = "Open in Spotify 🎵";

        info.appendChild(titleP);
        info.appendChild(artistP);
        info.appendChild(timeP);
        info.appendChild(spotifyLink);

        div.appendChild(img);
        div.appendChild(info);
        savedMusic.appendChild(div);
      });
    });
  }

  addMusicBtn.addEventListener("click", async () => {
    const queryText = musicInput.value.trim();
    if(!queryText) return alert("Type an artist or song!");

    searchResults.innerHTML = "<p style='text-align:center; color:#ff69b4;'>Searching for magic... ✨</p>";
    try {
      // Updated to use the live Vercel backend server
        const res = await fetch(`https://love-site-spotify-backend.vercel.app/search?q=${encodeURIComponent(queryText)}`);

      const data = await res.json();

      if(!data || data.length === 0) {
        searchResults.innerHTML = "<p style='text-align:center; color:#ff1493;'>No results found 😢 Try another search!</p>";
        return;
      }

      searchResults.innerHTML = "";
      data.forEach((track) => {
        const div = document.createElement("div");
        div.className = "musicItem";

        const img = document.createElement("img");
        img.src = track.album.images[0]?.url || "https://via.placeholder.com/60?text=
