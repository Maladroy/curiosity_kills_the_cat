const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

let cachedImage;
let lastResetDate = null; // Tracks the last date string we reset on

// ==========================================
// BOOT SEQUENCE: Load Cache or Fallback
// ==========================================
function loadInitialImage() {
  try {
    cachedImage = fs.readFileSync('./current_layer.png');
    console.log("Found previous iteration on disk. Resuming the abyss.");
  } catch (err) {
    try {
      cachedImage = fs.readFileSync('./stephan.png');
      console.log("No previous iteration. Loaded seed image (stephan.png).");
    } catch (fatalErr) {
      console.error("CRITICAL: stephan.png not found in the root directory!");
      process.exit(1); 
    }
  }
}

// Run boot sequence
loadInitialImage();

let isRendering = false;

async function takeScreenshot() {
  if (isRendering) return;
  isRendering = true;

  try {
    console.log("Spinning up headless Chrome...");
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote',
        '--disable-gpu'
      ] 
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1200, height: 1200 });

    console.log("Loading GitHub profile...");
    await page.goto('https://github.com/Maladroy', {
      waitUntil: 'load',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("Targeting the README area...");
    const readmeElement = await page.$('article.markdown-body');

    if (readmeElement) {
      cachedImage = await readmeElement.screenshot({ type: 'png' });
      console.log("README successfully cropped and captured!");
    } else {
      console.log("Could not find README element, capturing whole page.");
      cachedImage = await page.screenshot({ type: 'png' });
    }

    fs.writeFileSync('./current_layer.png', cachedImage);
    console.log("Iteration saved to current_layer.png.");

    await browser.close();
  } catch (err) {
    console.error("Inception failed:", err);
  } finally {
    isRendering = false;
  }
}

// ==========================================
// SERVER ROUTE: Serve & Process
// ==========================================
app.get('/', (req, res) => {
  // Defeat GitHub Camo proxy caching
  res.setHeader('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'image/png');

  //  Check if it's the weekend
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = (day === 0 || day === 6);
  const dateString = today.toDateString();

  // If it's the weekend and we haven't executed a reset for today's date yet
  if (isWeekend && lastResetDate !== dateString) {
    console.log(`Weekend detected (${dateString})! Collapsing the loop back to the surface.`);
    try {
      cachedImage = fs.readFileSync('./stephan.png');
      if (fs.existsSync('./current_layer.png')) {
        fs.unlinkSync('./current_layer.png');
      }
      lastResetDate = dateString; // Lock the reset so it only triggers once per weekend day
    } catch (err) {
      console.error("Failed to execute weekend reset:", err);
    }
  }

  // Serve the image INSTANTLY from RAM
  res.send(cachedImage);

  takeScreenshot();
});

// Keep-Awake endpoint for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake.');
});

app.listen(PORT, () => {
  console.log(`Inception engine running on port ${PORT}`);
});