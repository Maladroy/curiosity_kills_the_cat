const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

let cachedImage;

// ==========================================
// BOOT SEQUENCE: Load Cache or Fallback
// ==========================================
function loadInitialImage() {
  try {
    // Try to load the saved iteration first
    cachedImage = fs.readFileSync('./current_layer.png');
    console.log("Found previous iteration on disk.");
  } catch (err) {
    try {
      // If no iteration exists (cold start), load the seed cat
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

    // Give GitHub an extra 2 seconds to load lazy images
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("Targeting the README area...");
    // This is the CSS selector for the actual README box on a GitHub profile
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

//? Probably don't need this if we going to use uptimebot
// setInterval(() => {
//   console.log("Cron timer triggered background render.");
//   takeScreenshot();
// }, 5 * 60 * 1000); // 5 minutes

// ==========================================
// SERVER ROUTE: Serve the Image
// ==========================================
app.get('/', (req, res) => {
  // THE SECRET HANDSHAKE (Defeat GitHub Camo)
  res.setHeader('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'image/png');

  // Serve the image INSTANTLY from RAM
  res.send(cachedImage);

  // Trigger a new render in the background because a visitor arrived
  takeScreenshot();
});

app.listen(PORT, () => {
  console.log(`Inception engine running on port ${PORT}`);
});

app.get('/ping', (req, res) => {
  res.status(200).send('Nudged');
});