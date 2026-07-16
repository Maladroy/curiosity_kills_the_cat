const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Safely load the initial seed image into memory
let cachedImage;
try {
  cachedImage = fs.readFileSync('./seed.png');
  console.log("Seed image loaded successfully.");
} catch (err) {
  console.error("CRITICAL: stephan.png not found in the root directory!");
  process.exit(1);
}

let isRendering = false;

app.get('/inception', async (req, res) => {
  // BOSS FIGHT 1: Defeat GitHub Camo caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'image/png');

  // Serve the image instantly so GitHub doesn't time out
  res.send(cachedImage);

  // BOSS FIGHT 2: Prevent the Infinite Loop
  if (isRendering) return;
  isRendering = true;

  try {
    // Launch headless browser (Optimized for Render)
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Prevents memory crashes on cloud hosts
        '--single-process'
      ]
    });

    const page = await browser.newPage();

    // Act like a real browser so GitHub doesn't block the request
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set viewport to capture a nice wide profile banner
    await page.setViewport({ width: 1200, height: 800 });

    // Go to your GitHub profile
    await page.goto('https://github.com/Maladroy', {
      waitUntil: 'networkidle2',
      timeout: 15000 // Don't hang forever if GitHub is slow
    });

    // Take the screenshot and overwrite the cache in memory
    const newScreenshot = await page.screenshot({ type: 'png' });
    cachedImage = newScreenshot;

    await browser.close();
    console.log("New inception layer rendered!");
  } catch (err) {
    console.error("Inception failed:", err);
  } finally {
    // Release the lock so the next visitor triggers a new screenshot
    isRendering = false;
  }
});

app.listen(PORT, () => {
  console.log(`Inception engine running on port ${PORT}`);
});
