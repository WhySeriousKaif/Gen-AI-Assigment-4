import OpenAI from 'openai';
import dotenv from 'dotenv';
import {
  open_browser,
  take_screenshot,
  navigate_to_url,
  click_on_screen,
  send_keys,
  scroll,
  double_click,
  close_browser,
  get_active_page
} from './agentTools.js';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Injects a script into the Playwright browser page to find all visible,
 * interactive DOM elements and calculate their precise center (x, y) coordinates.
 * This translates pure coordinates into structural semantic items for the LLM.
 * @returns {Promise<Array>} List of interactive elements.
 */
export async function get_interactive_elements() {
  const page = get_active_page();
  if (!page) return [];

  return await page.evaluate(() => {
    const elements = [];
    // Scan standard form and navigation elements
    const selectors = 'input, textarea, button, a, [role="button"], [role="checkbox"], [role="combobox"]';
    const items = document.querySelectorAll(selectors);

    let idCounter = 0;
    items.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Only include elements that are actually drawn on the screen and visible
      if (rect.width === 0 || rect.height === 0) return;

      // EXCLUDE OFFSCREEN ELEMENTS: Must be visible in the current 1280x800 viewport
      const inViewport = (
        rect.top >= -50 &&
        rect.bottom <= (window.innerHeight + 50) &&
        rect.left >= -50 &&
        rect.right <= (window.innerWidth + 50)
      );
      if (!inViewport) return;

      // EXCLUDE STATIC CODE HIGHLIGHTS BUT PRESERVE INTERACTIVE FORM FIELDS
      if (el.closest('pre') || el.closest('code') || el.closest('.code-block')) {
        const tag = el.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'button') {
          return;
        }
      }

      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) return;

      // Find center coordinate
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);

      // Search for associated labels
      let label = "";
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.innerText;
      }
      if (!label) {
        const parentLabel = el.closest('label');
        if (parentLabel) {
          label = parentLabel.innerText;
        } else {
          // Check sibling labels inside the same container
          const parent = el.parentElement;
          if (parent) {
            const siblingLabel = parent.querySelector('label');
            if (siblingLabel) label = siblingLabel.innerText;
          }
        }
      }

      // Check placeholder, aria-labels, or innerText as fallback labels
      const placeholder = el.getAttribute('placeholder') || "";
      const ariaLabel = el.getAttribute('aria-label') || "";
      const text = el.innerText ? el.innerText.trim() : (el.value ? el.value.trim() : "");

      elements.push({
        id: idCounter++,
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || "",
        label: (label || ariaLabel || text || placeholder).trim().replace(/\n/g, ' '),
        placeholder,
        text: text.slice(0, 50),
        x,
        y,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    });

    return elements;
  });
}

// Module-level termination flag
let isTerminationRequested = false;

export function requestAgentTermination() {
  isTerminationRequested = true;
  // Instantly force-abort any active Playwright browser actions
  close_browser().catch((err) => {
    console.error("[AgentLoop] Error force-closing browser on termination:", err.message);
  });
}

/**
 * Runs the intelligent AI Agent Loop to automate the target form.
 * @param {string} targetUrl The target web address to automate.
 * @param {string} nameInput Target Name/Username to fill.
 * @param {string} descInput Target Bio/Description to fill.
 * @param {string} providerOrCallback Selects LLM provider ('openai' | 'gemini') or onStepUpdate function.
 * @param {string} [model] Selects custom model (e.g. 'gpt-4o-mini' | 'gemini-1.5-flash').
 * @param {string} [customApiKey] User custom API Key (falls back to process.env).
 * @param {number|Function} [maxStepsOrCallback] User max execution steps or callback.
 * @param {Function} [onStepUpdateCallback] Callback to stream the logs & screenshots back to Express.
 */
/**
 * Runs the intelligent AI Agent Loop to automate the target web page.
 * Uses a clean, destructured options object representing the modern Agent SDK style.
 * 
 * --- COURSE CONCEPTS MAP ---
 * 1. Agent Lifecycle (Topic 7) - Start, execute reasoning steps, and teardown cleanly.
 * 2. Reasoning + Tool Calling Loop (Topic 3) - Iterative perception, thought, action planning.
 * 3. Observability & Tracing (Topic 8) - Stream logs and screenshots back to the UI console.
 */
export async function runAgentLoop({
  targetUrl,
  objective,
  provider = 'openai',
  modelSelected = 'gpt-4o-mini',
  apiKeySelected = '',
  maxSteps = 15,
  onStepUpdate = () => {}
}) {
  const log = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[AgentLoop] [${timestamp}] ${msg}`);
    // Tracing/Observability: Stream telemetry logs back to frontend SSE channel (Topic 8)
    onStepUpdate({ type: 'log', message: `[${timestamp}] ${msg}` });
  };

  try {
    log("🚀 Starting Automation Agent Process...");
    isTerminationRequested = false; // Reset termination flag at start!

    // Step 1: Open browser
    log("Opening clean browser instance...");
    await open_browser();

    // Step 2: Navigate to page
    log(`Navigating browser to: ${targetUrl}`);
    await navigate_to_url(targetUrl);

    let step = 0;
    let finished = false;
    const actionHistory = [];

    // Send initial screenshot
    let initialScreenshot = await take_screenshot();
    onStepUpdate({ type: 'screenshot', base64: initialScreenshot });

    while (step < maxSteps && !finished) {
      // Defensively check for client-side termination request before starting the step
      if (isTerminationRequested) {
        throw new Error("Agent execution manually terminated by user.");
      }
      step++;
      log(`=== 🤖 Starting Loop Step ${step}/${maxSteps} ===`);

      // 1. Capture current screenshot and interactive elements
      log("Capturing page screenshot and scanning interactive elements...");
      const screenshotBase64 = await take_screenshot();
      const elements = await get_interactive_elements();

      // Update UI with latest visual and structural view
      onStepUpdate({ type: 'screenshot', base64: screenshotBase64 });

      // Format elements list for the LLM prompt
      const elementsListText = elements
        .map(el => `ID [${el.id}] | Tag <${el.tag}> | Label: "${el.label}" | Placeholder: "${el.placeholder}" | Center: (${el.x}, ${el.y})`)
        .join('\n');

      log(`Found ${elements.length} interactive elements on current screen.`);

      // Format action history text for LLM context
      const actionHistoryText = actionHistory.length > 0
        ? actionHistory.map(h => `Step ${h.step}: Thought: "${h.thought}" -> Action: ${h.action}${h.args ? ' ' + JSON.stringify(h.args) : ''}`).join('\n')
        : "No actions taken yet.";

      // Self-Correction Loop Prevention Feedback (Topic 3: Agent failure modes / loop detection)
      let loopWarningText = "";
      if (actionHistory.length >= 1) {
        const last = actionHistory[actionHistory.length - 1];
        if (last.action === 'click_on_screen') {
          loopWarningText = `\n⚠️ NOTICE: Your last action was click_on_screen at (${last.args?.x}, ${last.args?.y}). If the page did not change or navigate, DO NOT click there again. Click a different coordinate or element, scroll, or choose an alternate action.`;
        } else if (last.action === 'send_keys') {
          loopWarningText = `\n⚠️ NOTICE: Your last action was typing "${last.args?.text}". If the text is entered but not submitted, look for a search/submit button to click or press Enter.`;
        }
      }

      // 2. Query selected LLM model for visual decision
      const prompt = `
You are an advanced Browser Automation Agent. Your objective on the current web page is:
"${objective}"

${loopWarningText}

To achieve this, look at the screenshot and use the extracted list of visible elements below to plan your next action.
You must click focusable elements to focus/select them, and then use "send_keys" to input text.
Provide your reasoning step-by-step in the "thought" field.

--- ACTION HISTORY ---
${actionHistoryText}

--- VISIBLE INTERACTIVE ELEMENTS ---
${elementsListText}

--- OPERATIONAL RULES ---
1. Use the elements list to find exact (x, y) coordinates for "click_on_screen" or "double_click".
2. The click action focuses an input field. Once focused, you MUST use the "send_keys" tool to type into it.
3. When the objective has been fully accomplished successfully (or if you see confirmation/validation that the task is completed), call the "finish" action.
4. If the required elements are not currently visible on the screen, scroll up or down to reveal them using the "scroll" action.
5. Provide your output STRICTLY as a JSON object of this schema:
{
  "thought": "Explain your step-by-step reasoning based on what you see in the screenshot",
  "action": "click_on_screen" | "send_keys" | "scroll" | "double_click" | "finish",
  "args": {
    "x": number, (required for click_on_screen and double_click)
    "y": number, (required for click_on_screen and double_click)
    "text": "string", (required for send_keys)
    "direction": "up" | "down", (required for scroll)
    "amount": number (optional for scroll, e.g. 500 for normal scroll)
  }
}
`;

      const keyToUse = apiKeySelected || process.env.OPENAI_API_KEY;
      if (!keyToUse) {
        throw new Error("OpenAI API Key is missing. Please enter your key in the cockpit or set OPENAI_API_KEY.");
      }

      const modelToUse = modelSelected || 'gpt-4o-mini';
      log(`Calling OpenAI ${modelToUse} multimodal to analyze page state...`);
      const openaiInstance = new OpenAI({ apiKey: keyToUse });

      let response;
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          response = await openaiInstance.chat.completions.create({
            model: modelToUse,
            messages: [
              {
                role: 'system',
                content: 'You are a precise browser controller. You always respond in raw JSON.'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/png;base64,${screenshotBase64}`,
                      detail: 'low'
                    }
                  }
                ]
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
          });
          break;
        } catch (err) {
          attempts++;
          if ((err.status === 429 || err.message.includes('429')) && attempts < maxAttempts) {
            const retryAfter = 3 + attempts * 2;
            log(`⚠️ OpenAI Rate limit hit (429). Retrying in ${retryAfter} seconds (Attempt ${attempts}/${maxAttempts})...`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
          } else {
            throw err;
          }
        }
      }
      const responseText = response.choices[0].message.content;

      // Clean up markdown formatting if present
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      let decision;
      try {
        decision = JSON.parse(cleanText);
      } catch (err) {
        log(`❌ Failed to parse JSON response from LLM. Raw text: ${cleanText}`);
        throw new Error("Invalid JSON response from Agent model.");
      }

      log(`🤖 LLM Thought: "${decision.thought}"`);
      log(`🤖 LLM Decided Action: "${decision.action}"` + (decision.args ? ` with args: ${JSON.stringify(decision.args)}` : ""));

      // 3. Execute the chosen tool
      switch (decision.action) {
        case 'click_on_screen':
          if (decision.args.x === undefined || decision.args.y === undefined) {
            throw new Error("Action click_on_screen requires x and y coordinates.");
          }
          await click_on_screen(decision.args.x, decision.args.y);
          log(`Executed click at (${decision.args.x}, ${decision.args.y})`);
          break;

        case 'send_keys':
          if (!decision.args.text) {
            throw new Error("Action send_keys requires text argument.");
          }
          await send_keys(decision.args.text);
          log(`Typed keys: "${decision.args.text}"`);
          break;

        case 'scroll':
          const dir = decision.args.direction || 'down';
          let amt = decision.args.amount || 500;
          if (amt < 10) {
            amt = amt * 500; // Scale page-level scrolling units (e.g. 1 or 2) into pixels defensively
          }
          await scroll(dir, amt);
          log(`Scrolled page ${dir} by ${amt}px`);
          break;

        case 'double_click':
          if (decision.args.x === undefined || decision.args.y === undefined) {
            throw new Error("Action double_click requires x and y coordinates.");
          }
          await double_click(decision.args.x, decision.args.y);
          log(`Executed double-click at (${decision.args.x}, ${decision.args.y})`);
          break;

        case 'finish':
          finished = true;
          log("🎉 Form filling successfully automated! Agent loop reports task finished.");
          break;

        default:
          throw new Error(`Unknown action decided by AI: ${decision.action}`);
      }

      // Record this action to history so the next step knows what was done
      actionHistory.push({
        step,
        thought: decision.thought,
        action: decision.action,
        args: decision.args
      });

      // Add a small delay between steps for visual clarity and loading
      await new Promise(r => setTimeout(r, 1500));
    }

    if (!finished) {
      log(`⚠️ Agent loop terminated: reached maximum step budget of ${maxSteps} steps without explicit finish.`);
    }

    // Clean up browser
    await close_browser();
    log("🏁 Agent execution complete. Browser successfully shut down.");
    onStepUpdate({ type: 'status', status: 'completed' });

  } catch (error) {
    const isTerminated = isTerminationRequested || error.message.includes('closed') || error.message.includes('Browser is not open') || error.message.includes('connect');
    const displayError = isTerminated ? "Agent execution manually terminated by user." : error.message;
    
    const isHighDemand = error.message.includes('429') || 
                         error.message.includes('quota') || 
                         error.message.includes('RESOURCE_EXHAUSTED') || 
                         error.message.includes('overloaded');
                         
    const finalError = isHighDemand
      ? `${displayError} (⚠️ OpenAI is experiencing high demand or rate limits. Please try again in a few minutes or switch to gpt-4o-mini in Brain Configuration.)`
      : displayError;

    log(`❌ Fatal Agent Error: ${finalError}`);
    log("Closing browser safely...");
    await close_browser();
    onStepUpdate({ type: 'status', status: 'failed', error: finalError });
  }
}
