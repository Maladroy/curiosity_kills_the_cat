const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

let cachedImage;
try {
  cachedImage = fs.readFileSync('./seed.png');
  console.log("Seed image loaded successfully.");
} catch (err) {
  console.error("CRITICAL: seed.png not found in the root directory!");
  process.exit(1); 
}

let isRendering = false;

// We are moving to the root '/' route to break the old cache permanently!
app.get('/', async (req, res) => {
  // THE SECRET HANDSHAKE:
  // 'private' and 'max-age=0' tell GitHub Camo: "Do not store this on your CDN."
  res.setHeader('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'image/png');

  // Serve the cached image instantly so GitHub doesn't wait
  res.send(cachedImage);

  // Prevent recursion loop
  if (isRendering) return;
  isRendering = true;

  try {
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
    await page.setViewport({ width: 1200, height: 800 });

    console.log("Taking screenshot of profile...");
    await page.goto('https://github.com/Maladroy', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    const newScreenshot = await page.screenshot({ type: 'png' });
    cachedImage = newScreenshot;

    await browser.close();
    console.log("New inception layer rendered successfully!");
  } catch (err) {
    console.error("Inception failed:", err);
  } finally {
    isRendering = false;
  }
});

app.listen(PORT, () => {
  console.log(`Inception engine running on port ${PORT}`);
});