// ------------------- IMPORT FIREBASE -------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ------------------- FIREBASE CONFIG -------------------
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
const analytics = getAnalytics(app);
const db = getFirestore(app);

// ------------------- CLOUDINARY -------------------
const CLOUD_NAME = "dgip2lmxu";
const UPLOAD_PRESET = "unsigned_upload";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

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

  // ------------------- COLLECTIONS -------------------
  const collectionsMap = {
    photos: collection(db, "photos"),
    videos: collection(db, "videos"),
    music: collection(db, "music"),
    notes: collection(db, "notes"),
    timeline: collection(db, "timeline")
  };

  function addToTimeline(action) {
    addDoc(collectionsMap.timeline, { action, timestamp: new Date() });
  }

  // ------------------- TIMELINE -------------------
  const timelineList = document.getElementById("timelineList");
  function renderTimeline() {
    const q = query(collectionsMap.timeline, orderBy("timestamp", "desc"));
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

  onSnapshot(collection(db, "photos"), snapshot => {
    photoGallery.innerHTML = "";
    if (snapshot.empty) {
      photoGallery.innerHTML = "<p>No photos yet 💔</p>";
      return;
    }
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.url) return;
      const img = document.createElement("img");
      img.src = data.url;
      img.alt = "Cherished photo";
      photoGallery.appendChild(img);
    });
  });

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file);
      await addDoc(collectionsMap.photos, { url, timestamp: new Date() });
      addToTimeline("Photo added 💖");
      photoInput.value = "";
    } catch (err) {
      console.error("Photo upload failed:", err);
      alert("Photo upload failed 😢");
    }
  });

  // ------------------- VIDEOS -------------------
  const videoInput = document.getElementById("videoInput");
  const videoGallery = document.getElementById("videoGallery");

  onSnapshot(collection(db, "videos"), snapshot => {
    videoGallery.innerHTML = "";
    if (snapshot.empty) {
      videoGallery.innerHTML = "<p>No videos yet 💔</p>";
      return;
    }
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.url) return;
      const video = document.createElement("video");
      video.src = data.url;
      video.controls = true;
      video.width = 300;
      videoGallery.appendChild(video);
    });
  });

  videoInput.addEventListener("change", async () => {
    const file = videoInput.files[0];
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file);
      await addDoc(collectionsMap.videos, { url, timestamp: new Date() });
      addToTimeline("Video added 🎥");
      videoInput.value = "";
    } catch (err) {
      console.error("Video upload failed:", err);
      alert("Video upload failed 😢");
    }
  });
    
    // ------------------- LIGHTBOX -------------------
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.style.display = "none";
    lightbox.style.position = "fixed";
    lightbox.style.top = "0";
    lightbox.style.left = "0";
    lightbox.style.width = "100%";
    lightbox.style.height = "100%";
    lightbox.style.background = "rgba(0,0,0,0.8)";
    lightbox.style.display = "flex";
    lightbox.style.alignItems = "center";
    lightbox.style.justifyContent = "center";
    lightbox.style.zIndex = "10000";
    lightbox.style.padding = "20px";
    lightbox.style.boxSizing = "border-box";
    lightbox.style.overflow = "auto";

    const closeBtn = document.createElement("span");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "20px";
    closeBtn.style.right = "30px";
    closeBtn.style.fontSize = "40px";
    closeBtn.style.color = "white";
    closeBtn.style.cursor = "pointer";
    closeBtn.addEventListener("click", () => lightbox.style.display = "none");

    let contentElement = document.createElement("div");
    contentElement.style.maxWidth = "90%";
    contentElement.style.maxHeight = "90%";
    contentElement.style.display = "flex";
    contentElement.style.alignItems = "center";
    contentElement.style.justifyContent = "center";

    lightbox.appendChild(closeBtn);
    lightbox.appendChild(contentElement);
    document.body.appendChild(lightbox);

    // ------------------- OPEN LIGHTBOX FUNCTION -------------------
    function openLightbox(url, isVideo = false) {
      contentElement.innerHTML = ""; // Clear previous content

      if (isVideo) {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = "100%";
        video.style.maxHeight = "100%";
        contentElement.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.src = url;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.borderRadius = "15px";
        contentElement.appendChild(img);
      }

      lightbox.style.display = "flex";
    }

    // ------------------- ATTACH CLICK TO GALLERY ITEMS -------------------
    function enableGalleryLightbox() {
      // Photos
      document.querySelectorAll("#photoGallery img").forEach(img => {
        img.style.cursor = "pointer";
        img.addEventListener("click", () => openLightbox(img.src, false));
      });

      // Videos
      document.querySelectorAll("#videoGallery video").forEach(video => {
        video.style.cursor = "pointer";
        video.addEventListener("click", () => openLightbox(video.src, true));
      });
    }

    // Call whenever gallery updates
    const photoObserver = new MutationObserver(enableGalleryLightbox);
    photoObserver.observe(document.getElementById("photoGallery"), { childList: true });

    const videoObserver = new MutationObserver(enableGalleryLightbox);
    videoObserver.observe(document.getElementById("videoGallery"), { childList: true });


  // ------------------- NOTES -------------------
  const noteInput = document.getElementById("noteInput");
  const saveNoteBtn = document.getElementById("saveNoteBtn");
  const notesList = document.getElementById("notesList");

  function renderNotes() {
    const q = query(collectionsMap.notes, orderBy("timestamp", "desc"));
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
    await addDoc(collectionsMap.notes, { text, timestamp: new Date() });
    addToTimeline("Note added ✍️");
    noteInput.value = "";
  });

  // ------------------- MUSIC -------------------
  const musicInput = document.getElementById("musicInput");
  const addMusicBtn = document.getElementById("addMusicBtn");
  const searchResults = document.getElementById("searchResults");
  const savedMusic = document.getElementById("savedMusic");

  function renderSavedMusic() {
    const q = query(collectionsMap.music, orderBy("timestamp", "desc"));
    onSnapshot(q, snapshot => {
      savedMusic.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "musicItem enhanced";

        const img = document.createElement("img");
        img.src = data.cover || "https://via.placeholder.com/60?text=🎵";
        img.alt = "Album cover";

        const info = document.createElement("div");
        const titleP = document.createElement("p");
        titleP.textContent = data.title;
        const artistP = document.createElement("p");
        artistP.textContent = data.artist;

        if (data.preview) {
          const audio = document.createElement("audio");
          audio.src = data.preview;
          audio.controls = true;
          info.appendChild(audio);
        }

        const btnContainer = document.createElement("div");
        btnContainer.className = "musicButtons";

        const spotifyLink = document.createElement("a");
        spotifyLink.href = data.url;
        spotifyLink.target = "_blank";
        spotifyLink.textContent = "Open in Spotify 🎵";
        spotifyLink.className = "spotifyBtn";

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove ❌";
        removeBtn.className = "removeBtn";
        removeBtn.addEventListener("click", async () => {
          await doc.ref.delete();
          addToTimeline(`Music removed: ${data.title} ❌`);
        });

        btnContainer.append(spotifyLink, removeBtn);
        info.append(titleP, artistP, btnContainer);
        div.append(img, info);
        savedMusic.appendChild(div);
      });
    });
  }

  addMusicBtn.addEventListener("click", async () => {
    const queryText = musicInput.value.trim();
    if (!queryText) return alert("Type an artist or song!");
    searchResults.innerHTML = "<p class='loading'>Searching... ✨</p>";

    try {
      const res = await fetch(`https://love-site-spotify-backend.vercel.app/search?q=${encodeURIComponent(queryText)}`);
      const data = await res.json();
      if (!data || data.length === 0) {
        searchResults.innerHTML = "<p class='loading noResults'>No results found 😢</p>";
        return;
      }

      searchResults.innerHTML = "";
      data.forEach(track => {
        const div = document.createElement("div");
        div.className = "musicItem enhanced searchResult";

        const img = document.createElement("img");
        img.src = track.album?.images?.[0]?.url || "https://via.placeholder.com/60?text=🎵";
        img.alt = "Album cover";

        const info = document.createElement("div");
        const titleP = document.createElement("p");
        titleP.textContent = track.name;
        const artistP = document.createElement("p");
        artistP.textContent = track.artists.map(a => a.name).join(", ");

        const btnContainer = document.createElement("div");
        btnContainer.className = "musicButtons";

        const addBtn = document.createElement("button");
        addBtn.textContent = "Add ➕";
        addBtn.className = "addBtn";
        addBtn.addEventListener("click", async () => {
          await addDoc(collectionsMap.music, {
            title: track.name,
            artist: track.artists.map(a => a.name).join(", "),
            cover: track.album?.images?.[0]?.url || null,
            preview: track.preview_url || null,
            url: track.external_urls.spotify,
            timestamp: new Date()
          });
          addToTimeline(`Music added: ${track.name} 🎵`);
        });

        const spotifyLink = document.createElement("a");
        spotifyLink.href = track.external_urls.spotify;
        spotifyLink.target = "_blank";
        spotifyLink.textContent = "Open in Spotify 🎵";
        spotifyLink.className = "spotifyBtn";

        btnContainer.append(addBtn, spotifyLink);
        info.append(titleP, artistP, btnContainer);
        div.append(img, info);
        searchResults.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      searchResults.innerHTML = "<p class='loading noResults'>Error fetching music 😢</p>";
    }
  });

  // ------------------- INITIAL RENDER -------------------
  renderTimeline();
  renderNotes();
  renderSavedMusic();
});
