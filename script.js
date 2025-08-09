const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startWebcamBtn = document.getElementById('start-webcam');
const stopWebcamBtn = document.getElementById('stop-webcam');
const uploadImageInput = document.getElementById('upload-image');
const resultDiv = document.getElementById('result');
const extraDetailsDiv = document.getElementById('extra-details');
const resultCard = document.getElementById('result-card');
const loadingDiv = document.getElementById('loading');

let stream = null;
let webcamActive = false;

startWebcamBtn.onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.style.display = 'block';
    webcamActive = true;
    startWebcamBtn.disabled = true;
    stopWebcamBtn.disabled = false;
    uploadImageInput.disabled = true;
    video.addEventListener('play', webcamLoop);
  } catch (err) {
    alert('Could not access webcam: ' + err);
  }
};

stopWebcamBtn.onclick = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  video.style.display = 'none';
  webcamActive = false;
  startWebcamBtn.disabled = false;
  stopWebcamBtn.disabled = true;
  uploadImageInput.disabled = false;
  resultCard.style.display = 'none';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

uploadImageInput.onchange = () => {
  if (!uploadImageInput.files.length) return;
  webcamActive = false;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.style.display = 'none';
  }
  startWebcamBtn.disabled = false;
  stopWebcamBtn.disabled = true;
  const file = uploadImageInput.files[0];
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    startCalculation();
  };
  img.src = URL.createObjectURL(file);
};

function webcamLoop() {
  if (!webcamActive) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  startCalculation();
  requestAnimationFrame(webcamLoop);
}

function startCalculation() {
  loadingDiv.style.display = 'block';
  resultCard.style.display = 'none';
  setTimeout(processImage, 6500);
}

function processImage() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const threshold = 120;
  let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
  let whitePixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const isWhite = gray > threshold;
    const idx = i / 4;
    const x = idx % canvas.width;
    const y = Math.floor(idx / canvas.width);
    if (isWhite) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
      whitePixels++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const radius = Math.max((maxX - minX), (maxY - minY)) / 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'red';
  ctx.stroke();

  const avgRadius = (maxX - minX + maxY - minY) / 4;
  const circleArea = Math.PI * avgRadius * avgRadius;
  let roundness = whitePixels / circleArea;
  if (roundness > 1) roundness = 1;

  resultDiv.textContent = `Rough Roundness: ${(roundness * 100).toFixed(1)}%`;
  extraDetailsDiv.innerHTML = `
    <p>Detected Diameter: ${(2 * avgRadius).toFixed(2)} px</p>
    <p>White Pixels: ${whitePixels}</p>
    <p>Circle Area (est.): ${circleArea.toFixed(2)} px²</p>
  `;
  loadingDiv.style.display = 'none';
  resultCard.style.display = 'block';
}
