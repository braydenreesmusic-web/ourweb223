// ------------------- IMPORT FIREBASE -------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// ------------------- FIREBASE CONFIG -------------------
const firebaseConfig = {
  apiKey: "AIzaSyCg4ff72caOr1rk9y7kZAkUbcyjqfPuMLI",
  authDomain: "ourwebsite223.firebaseapp.com",
  projectId: "ourwebsite223",
  storageBucket: "ourwebsite223.firebasestorage.app",
  messagingSenderId: "978864749848",
  appId: "1:978864749848:web:f1e635f87e2ddcc007f26d",
  measurementId: "G-823MYFCCMG"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ------------------- DOM LOADED -------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("App initialized!");

  // ------------------- NAVIGATION -------------------
  const sections = document.querySelectorAll(".section");
  const navButtons = document.querySelectorAll("nav button");

  function showSection(id) {
    sections.forEach(s => s.classList.remove("active"));
    const section = document.getElementById(id);
    if (section) section.classList.add("active");

    navButtons.forEach(btn => btn.classList.remove("active"));
    const activeBtn = Array.from(navButtons).find(btn => btn.dataset.section === id);
    if (activeBtn) activeBtn.classList.add("active");
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => showSection(btn.dataset.section));
  });

  // Show default section
  showSection("photos");

  // ------------------- FIRESTORE COLLECTIONS -------------------
  const collections = {
    photos: collection(db, "photos"),
    videos: collection(db, "videos"),
    music: collection(db, "music"),
    notes: collection(db, "notes"),
    timeline: collection(db, "timeline")
  };

  function addToTimeline(action) {
    addDoc(collections.timeline, { action, timestamp: new Date() });
  }

  // ------------------- TIMELINE -------------------
  const timelineList = document.getElementById("timelineList");
  function renderTimeline() {
    const q = query(collections.timeline, orderBy("timestamp", "desc"));
    onSnapshot(q, snapshot => {
      timelineList.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "timelineItem";
        div.innerHTML = `<strong>${data.timestamp.toDate().toLocaleString()}</strong><br>${data.action}`;
        timelineList.appendChild(div);
      });
    });
  }

  // ------------------- PHOTOS -------------------
  const photoInput = document.getElementById("photoInput");
  const photoGallery = document.getElementById("photoGallery");

  const photosQuery = query(collections.photos, orderBy("timestamp", "desc"));
  onSnapshot(photosQuery, snapshot => {
    photoGallery.innerHTML = "";
    snapshot.forEach(doc => {
      const img = document.createElement("img");
      img.src = doc.data().url;
      img.alt = "Cherished photo";
      photoGallery.appendChild(img);
    });
  });

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    if (!file) return;

    const storageRef = ref(storage, `photos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collections.photos, { url, timestamp: new Date() });
    addToTimeline("Photo added 💖");
    photoInput.value = "";
  });

  // ------------------- VIDEOS -------------------
  const videoInput = document.getElementById("videoInput");
  const videoGallery = document.getElementById("videoGallery");

  const videosQuery = query(collections.videos, orderBy("timestamp", "desc"));
  onSnapshot(videosQuery, snapshot => {
    videoGallery.innerHTML = "";
    snapshot.forEach(doc => {
      const video = document.createElement("video");
      video.src = doc.data().url;
      video.controls = true;
      videoGallery.appendChild(video);
    });
  });

  videoInput.addEventListener("change", async () => {
    const file = videoInput.files[0];
    if (!file) return;

    const storageRef = ref(storage, `videos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collections.videos, { url, timestamp: new Date() });
    addToTimeline("Video added 🎥");
    videoInput.value = "";
  });

  // ------------------- NOTES -------------------
  const noteInput = document.getElementById("noteInput");
  const saveNoteBtn = document.getElementById("saveNoteBtn");
  const notesList = document.getElementById("notesList");

  function renderNotes() {
    const q = query(collections.notes, orderBy("timestamp", "desc"));
    onSnapshot(q, snapshot => {
      notesList.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "noteItem";
        div.innerHTML = `<strong>${data.timestamp.toDate().toLocaleString()}</strong><br><em>${data.text}</em>`;
        notesList.appendChild(div);
      });
    });
  }

  saveNoteBtn.addEventListener("click", async () => {
    const text = noteInput.value.trim();
    if (!text) return;

    await addDoc(collections.notes, { text, timestamp: new Date() });
    addToTimeline("Note added ✍️");
    noteInput.value = "";
  });

  // ------------------- MUSIC -------------------
  const musicInput = document.getElementById("musicInput");
  const addMusicBtn = document.getElementById("addMusicBtn");
  const searchResults = document.getElementById("searchResults");
  const savedMusic = document.getElementById("savedMusic");

  function renderSavedMusic() {
    const q = query(collections.music, orderBy("timestamp", "desc"));
    onSnapshot(q, snapshot => {
      savedMusic.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();

        const div = document.createElement("div");
        div.className = "musicItem";

        const cover = (data.cover && data.cover.length) ? data.cover : "https://via.placeholder.com/60?text=🎵";
        const img = document.createElement("img");
        img.src = cover;
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

        info.append(titleP, artistP, timeP, spotifyLink);
        div.append(img, info);
        savedMusic.appendChild(div);
      });
    });
  }

  addMusicBtn.addEventListener("click", async () => {
    const queryText = musicInput.value.trim();
    if (!queryText) return alert("Type an artist or song!");

    searchResults.innerHTML = "<p style='text-align:center; color:#ff69b4;'>Searching... ✨</p>";

    try {
      const res = await fetch(`https://love-site-spotify-backend.vercel.app/search?q=${encodeURIComponent(queryText)}`);
      const data = await res.json();

      if (!data || data.length === 0) {
        searchResults.innerHTML = "<p style='text-align:center; color:#ff1493;'>No results found 😢</p>";
        return;
      }

      searchResults.innerHTML = "";
      data.forEach(track => {
        const div = document.createElement("div");
        div.className = "musicItem";

        const cover = (track.album?.images?.[0]?.url) || "https://via.placeholder.com/60?text=🎵";
        const img = document.createElement("img");
        img.src = cover;
        img.alt = "Album cover";

        const info = document.createElement("div");
        const titleP = document.createElement("p");
        titleP.textContent = track.name;
        const artistP = document.createElement("p");
        artistP.textContent = track.artists.map(a => a.name).join(", ");

        const spotifyLink = document.createElement("a");
        spotifyLink.href = track.external_urls.spotify;
        spotifyLink.target = "_blank";
        spotifyLink.textContent = "Open in Spotify 🎵";

        info.append(titleP, artistP, spotifyLink);
        div.append(img, info);

        div.addEventListener("click", async () => {
          await addDoc(collections.music, {
            title: track.name,
            artist: track.artists.map(a => a.name).join(", "),
            cover: cover,
            preview: track.preview_url || null,
            url: track.external_urls.spotify,
            timestamp: new Date()
          });
          addToTimeline(`Music added: ${track.name} 🎵`);
        });

        searchResults.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      searchResults.innerHTML = "<p style='text-align:center; color:#ff1493;'>Error fetching music 😢</p>";
    }
  });

  // ------------------- INITIAL RENDER -------------------
  renderTimeline();
  renderNotes();
  renderSavedMusic();
});
