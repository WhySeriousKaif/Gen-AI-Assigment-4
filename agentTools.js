import { chromium } from 'playwright';

// Share browser state across tool invocations
let browser = null;
let context = null;
let page = null;

/**
 * Initializes and launches a Chromium browser instance.
 * Sets a standard desktop viewport (1280x800) for consistent coordinate mapping.
 * @returns {Promise<{browser, context, page}>}
 */
export async function open_browser() {
  if (browser) {
    return { browser, context, page };
  }
  
  console.log("[Tool] Launching Playwright Chromium browser...");
  browser = await chromium.launch({
    headless: true, // Headless is fully compatible with server environments
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  
  page = await context.newPage();
  console.log("[Tool] Browser opened successfully.");
  return { browser, context, page };
}

/**
 * Captures the current screenshot of the browser window.
 * @returns {Promise<string>} Base64-encoded PNG screenshot.
 */
export async function take_screenshot() {
  if (!page) {
    throw new Error("Browser is not open. Call open_browser() first.");
  }
  
  // Wait brief moments for any rendering/animations to complete
  await page.waitForTimeout(500);
  const buffer = await page.screenshot({ type: 'png' });
  return buffer.toString('base64');
}

/**
 * Directs the browser to a specific URL.
 * @param {string} url The web address to load.
 */
export async function navigate_to_url(url) {
  if (!page) {
    throw new Error("Browser is not open. Call open_browser() first.");
  }
  
  console.log(`[Tool] Navigating to URL: ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  // Extra wait to let pages hydrate fully
  await page.waitForTimeout(2000);

  // Defensively bypass common cookie consent popups (e.g. YouTube, Google, etc.) to prevent screen blocking
  try {
    const consentSelectors = [
      'button[aria-label="Accept the use of cookies and other data"]',
      'button[aria-label="Accept all"]',
      'button[aria-label="Accept All"]',
      'button:has-text("Accept all")',
      'button:has-text("Accept All")',
      'button:has-text("Agree")',
      'button:has-text("I agree")',
      'button:has-text("Consent")',
      '#accept-choices',
      '#cookie-accept'
    ];
    for (const selector of consentSelectors) {
      const btn = page.locator(selector);
      if (await btn.count() > 0) {
        console.log(`[Tool] Bypassing cookie consent popup with selector: ${selector}`);
        await btn.first().click();
        await page.waitForTimeout(1500); // Wait for the modal dialog to disappear fully
        break;
      }
    }
  } catch (e) {
    console.log("[Tool] Cookie consent bypass check skipped:", e.message);
  }
}

/**
 * Performs a mouse click at specified coordinate point.
 * @param {number} x X coordinate.
 * @param {number} y Y coordinate.
 */
export async function click_on_screen(x, y) {
  if (!page) {
    throw new Error("Browser is not open. Call open_browser() first.");
  }
  
  console.log(`[Tool] Clicking at coordinates: (${x}, ${y})`);
  // Move mouse smoothly to mimic human action, then click
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.click(x, y);
  // Let DOM handle focus or updates
  await page.waitForTimeout(500);
}

/**
 * Inputs text into whichever field currently has active keyboard focus.
 * @param {string} text The text keys to type.
 */
export async function send_keys(text) {
  if (!page) {
    throw new Error("Browser is not open. Call open_browser() first.");
  }
  
  console.log(`[Tool] Sending keys/typing: "${text}"`);
  // Types text character-by-character with standard human-like speed
  await page.keyboard.type(text, { delay: 50 });
  await page.waitForTimeout(500);
}

/**
 * Scrolls the viewport in the specified direction.
 * @param {string} direction 'up' or 'down'.
 * @param {number} [amount=500] Pixels to scroll.
 */
export async function scroll(direction, amount = 500) {
  if (!page) {
    throw new Error("Browser is not open. Call open_browser() first.");
  }
  
  const scrollAmount = direction.toLowerCase() === 'up' ? -amount : amount;
  console.log(`[Tool] Scrolling ${direction} by ${amount}px`);
  
  await page.evaluate((y) => {
    window.scrollBy(0, y);
  }, scrollAmount);
  
  await page.waitForTimeout(800);
}

/**
 * Performs a double-click action at specified coordinates.
 * @param {number} x X coordinate.
 * @param {number} y Y coordinate.
 */
export async function double_click(x, y) {
  if (!page) {
    throw new Error("Browser is not open. Call open_browser() first.");
  }
  
  console.log(`[Tool] Double clicking at coordinates: (${x}, ${y})`);
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.click(x, y, { clickCount: 2 });
  await page.waitForTimeout(500);
}

/**
 * Safely closes the browser instance and releases memory.
 */
export async function close_browser() {
  if (browser) {
    console.log("[Tool] Closing browser session...");
    try {
      await browser.close();
    } catch (err) {
      console.error("[Tool] Error during browser.close():", err.message);
    } finally {
      browser = null;
      context = null;
      page = null;
      console.log("[Tool] Browser closed.");
    }
  }
}

// Export the active page getter to allow other modules (like agentLoop) to inspect/evaluate directly on Playwright page.
export function get_active_page() {
  return page;
}
