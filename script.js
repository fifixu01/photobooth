// DOM references
const video = document.getElementById("video");
const captureBtn = document.getElementById("capture-btn");
const photosContainer = document.getElementById("photos");
const statusText = document.getElementById("status");

const selectedPhotoContainer = document.getElementById("selected-photo-container");
const downloadSelectedBtn = document.getElementById("download-selected-btn");

const stepCamera = document.getElementById("step-camera");
const stepChooseStrip = document.getElementById("step-choose-strip");
const stepBuildStrip = document.getElementById("step-build-strip");

const buildStripStartBtn = document.getElementById("build-strip-start");
const backToCameraFromChooseBtn = document.getElementById("back-to-camera-from-choose");
const backToChooseFromBuildBtn = document.getElementById("back-to-choose-from-build");

const modeButtons = document.querySelectorAll(".mode-btn");
const stripFrameCountLabel = document.getElementById("strip-frame-count-label");
const stripSelectGrid = document.getElementById("strip-select-grid");
const stripSelectStatus = document.getElementById("strip-select-status");
const stripStatus = document.getElementById("strip-status");

const buildStripBtn = document.getElementById("build-strip-btn");
const downloadStripBtn = document.getElementById("download-strip-btn");
const stripCanvas = document.getElementById("strip-canvas");

let stream = null;
let selectedImage = null;

// For strip building
let stripFrameCount = 2;
let stripSelectedThumbs = [];

// ---------- CAMERA SETUP ----------

async function startCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      statusText.textContent = "Your browser does not support webcam access 😢";
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    video.srcObject = stream;
    statusText.textContent = "Camera is ready. Click 'Take Photo'!";
  } catch (err) {
    console.error("Error accessing camera:", err);
    statusText.textContent =
      "Could not access camera. Check permissions or try a different browser.";
  }
}

// Capture a frame from the video and add it as a thumbnail
function capturePhoto() {
  if (!video.videoWidth || !video.videoHeight) {
    statusText.textContent = "Camera not ready yet. Please wait a moment.";
    return;
  }

  // Create an off-screen canvas
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");

  // Mirror horizontally so saved photo matches the preview
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert to image
  const img = document.createElement("img");
  img.src = canvas.toDataURL("image/png");
  img.alt = "Captured photo";

  // When thumbnail is clicked, show larger preview
  img.addEventListener("click", () => {
    selectPhotoForReview(img);
  });

  // Add to the thumbnails grid (newest first)
  photosContainer.prepend(img);

  // If this is the first photo, auto-select it
  if (!selectedImage) {
    selectPhotoForReview(img);
  }

  statusText.textContent = "Mirrored photo captured! Click a thumbnail to review.";
}

// ---------- REVIEW PANEL ----------

function selectPhotoForReview(imgElement) {
  selectedImage = imgElement;

  // Clear old content and insert a bigger version
  selectedPhotoContainer.innerHTML = "";

  const large = document.createElement("img");
  large.src = imgElement.src;
  large.alt = "Selected photo";
  large.classList.add("selected-photo");

  selectedPhotoContainer.appendChild(large);

  // Enable download button
  downloadSelectedBtn.disabled = false;

  // Visually mark active thumbnail in review grid
  document.querySelectorAll("#photos img").forEach((thumb) => {
    thumb.classList.remove("active");
  });
  imgElement.classList.add("active");

  statusText.textContent = "Photo selected. You can download it below.";
}

function downloadSelectedPhoto() {
  if (!selectedImage) return;

  const link = document.createElement("a");
  link.href = selectedImage.src;
  link.download = "photobooth-photo.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---------- STEP NAVIGATION ----------

function showStep(stepElement) {
  [stepCamera, stepChooseStrip, stepBuildStrip].forEach((el) => {
    el.classList.remove("active");
  });
  stepElement.classList.add("active");
}

// ---------- STRIP SETUP FLOW ----------

// Start strip building: go from camera to choose-step
function handleStartStripBuild() {
  const numPhotos = photosContainer.querySelectorAll("img").length;
  if (numPhotos === 0) {
    statusText.textContent =
      "You need at least one captured photo before building a strip.";
    return;
  }
  showStep(stepChooseStrip);
}

// Choose 2 or 4 frame mode
function handleModeButtonClick(btn) {
  modeButtons.forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  stripFrameCount = parseInt(btn.dataset.frames, 10) || 2;
  stripFrameCountLabel.textContent = stripFrameCount.toString();

  // Prepare thumbnails for strip selection
  prepareStripSelection();
  showStep(stepBuildStrip);
}

// Prepare selection grid for the strip step
function prepareStripSelection() {
  stripSelectGrid.innerHTML = "";
  stripSelectedThumbs = [];
  stripSelectStatus.textContent = "";
  stripStatus.textContent = "";
  downloadStripBtn.disabled = true;

  const reviewThumbs = photosContainer.querySelectorAll("img");

  if (reviewThumbs.length === 0) {
    stripSelectStatus.textContent =
      "No photos available. Go back and take or review some photos.";
    return;
  }

  reviewThumbs.forEach((srcImg, index) => {
    const thumb = document.createElement("img");
    thumb.src = srcImg.src;
    thumb.alt = `Photo ${index + 1}`;
    thumb.dataset.index = String(index);

    thumb.addEventListener("click", () => {
      toggleStripSelection(thumb);
    });

    stripSelectGrid.appendChild(thumb);
  });

  updateStripSelectStatus();
}

function toggleStripSelection(thumb) {
  const alreadySelected = thumb.classList.contains("active");

  if (alreadySelected) {
    thumb.classList.remove("active");
    stripSelectedThumbs = stripSelectedThumbs.filter((t) => t !== thumb);
  } else {
    if (stripSelectedThumbs.length >= stripFrameCount) {
      stripSelectStatus.textContent = `You can only select ${stripFrameCount} photos for this strip.`;
      return;
    }
    thumb.classList.add("active");
    stripSelectedThumbs.push(thumb);
  }

  updateStripSelectStatus();
}

function updateStripSelectStatus() {
  stripSelectStatus.textContent = `Selected ${stripSelectedThumbs.length} / ${stripFrameCount} photos.`;
}

// Build the strip canvas
async function handleBuildStrip() {
  if (stripSelectedThumbs.length === 0) {
    stripStatus.textContent = "Please select at least one photo.";
    return;
  }

  if (stripSelectedThumbs.length !== stripFrameCount) {
    stripStatus.textContent = `Please select exactly ${stripFrameCount} photos to build the strip.`;
    return;
  }

  stripStatus.textContent = "Building strip...";
  await buildStripCanvasFromSelection();
  stripStatus.textContent = "Strip built! You can download it as a PNG.";
  downloadStripBtn.disabled = false;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function buildStripCanvasFromSelection() {
  const frameCount = stripFrameCount;

  // Canvas dimensions (you can tweak these)
  const frameHeight = 400;
  const canvasWidth = 600;
  const canvasHeight = frameCount * frameHeight;

  stripCanvas.width = canvasWidth;
  stripCanvas.height = canvasHeight;

  const ctx = stripCanvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const marginX = 40;
  const marginY = 30;
  const boxWidth = canvasWidth - marginX * 2;
  const boxHeight = frameHeight - marginY * 2;

  // Load all images
  const images = await Promise.all(
    stripSelectedThumbs.map((thumb) => loadImage(thumb.src))
  );

  images.forEach((img, i) => {
    const frameTop = i * frameHeight;

    // Scale image to fit inside boxWidth x boxHeight (contain)
    const scale = Math.min(boxWidth / img.width, boxHeight / img.height);

    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const dx = (canvasWidth - drawWidth) / 2;
    const dy = frameTop + (frameHeight - drawHeight) / 2;

    // Optional: frame background
    ctx.fillStyle = "#fdf1fb";
    ctx.fillRect(marginX / 2, frameTop + marginY / 2, canvasWidth - marginX, frameHeight - marginY);

    // Draw the image
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  });
}

function downloadStrip() {
  const link = document.createElement("a");
  link.href = stripCanvas.toDataURL("image/png");
  link.download = `photobooth-strip-${stripFrameCount}frame.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---------- EVENT LISTENERS ----------

window.addEventListener("load", () => {
  startCamera();
});

captureBtn.addEventListener("click", capturePhoto);
downloadSelectedBtn.addEventListener("click", downloadSelectedPhoto);

buildStripStartBtn.addEventListener("click", handleStartStripBuild);

backToCameraFromChooseBtn.addEventListener("click", () => {
  showStep(stepCamera);
});

backToChooseFromBuildBtn.addEventListener("click", () => {
  showStep(stepChooseStrip);
});

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => handleModeButtonClick(btn));
});

buildStripBtn.addEventListener("click", handleBuildStrip);
downloadStripBtn.addEventListener("click", downloadStrip);
