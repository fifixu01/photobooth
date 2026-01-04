const video = document.getElementById("video");
const captureBtn = document.getElementById("capture-btn");
const photosContainer = document.getElementById("photos");
const statusText = document.getElementById("status");

let stream = null;

// Start the webcam
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

// Capture a frame from the video and add it as an image
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
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert to image
  const img = document.createElement("img");
  img.src = canvas.toDataURL("image/png");

  // Add to the photos section
  photosContainer.prepend(img);

  statusText.textContent = "Photo captured!";
}

// Set up event listeners
window.addEventListener("load", () => {
  startCamera();
});

captureBtn.addEventListener("click", capturePhoto);
