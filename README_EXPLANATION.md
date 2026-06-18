# Student Viva Study Guide: Website Automation Agent (Assignment 04)

Dear student, this guide is written in **simple, plain English** to help you understand every single line of code in this project and confidently explain it to your professor during your viva evaluation.

---

## 🌟 1. Project Overview & Objective

### What is this project?
Think of this project as building a **"mini-version" of a robotic web user**. Just like a human looks at a computer screen, finds a form field, clicks it, and types with a keyboard, our **Website Automation Agent** does the exact same thing automatically!

### The Challenge/Objective:
We want our agent to:
1. Navigate to this specific URL: `https://ui.shadcn.com/docs/forms/react-hook-form`
2. Automatically locate two form fields on the screen: **Name/Username** and **Description/Bio**.
3. Fill them in with whatever the user wants, and submit the form.
4. **Do all of this dynamically!** Meaning, we do not hardcode brittle CSS classes or selectors that break when the website changes. Instead, we use an AI model (like a human eye) to scan screenshots, find the center coordinates `(x, y)` of the fields, click them, and type.

---

## 📂 2. Folder Structure Explained Simply

Here is what each file in your `FinalProject` directory does and why it is there:

*   **`package.json`**: This is the configuration hub for our project. It contains a list of external packages (like Express, Playwright, and OpenAI) that our project needs. It also has standard scripts to run our program easily.
*   **`vite.config.js`**: A setup file for **Vite** (the modern tool that builds and runs our React frontend). It includes a "proxy" so that when React tries to talk to the backend, Vite redirects the messages to port `5001` automatically without CORS errors.
*   **`.env`**: A secure key vault. It stores your private **OpenAI API Key** so that the agent can connect to the GPT-4o-mini model.
*   **`server.js`**: The **Backend Server** (written in Express). It launches our browser controller in the background and sends real-time logs and photos to the React screen.
*   **`agentTools.js`**: The **Hands and Feet** of our agent. It contains direct instructions for the browser (such as click, scroll, type, take screenshot) using a library called **Playwright**.
*   **`agentLoop.js`**: The **Brain** of our agent. It takes screenshots, sends them to OpenAI, decodes what the AI wants to do next (e.g. "click here" or "type this"), and calls the tools from `agentTools.js` in a repeating cycle.
*   **`index.html`**: The basic skeleton of our visual dashboard page. It loads premium fonts from Google Fonts to make our UI look modern and beautiful.
*   **`src/main.jsx`**: The loader file that mounts our React application onto the page.
*   **`src/App.jsx`**: The **User Interface Dashboard** you see on your browser. It has inputs for the Name and Bio, a "Launch" button, a window that shows the live browser screenshots, and a terminal scrolling with real-time agent decisions.
*   **`src/App.css`**: The styling sheet that makes your dashboard look extremely futuristic (dark slate background, glowing neon highlights, smooth fade-in animations, and standard grid layouts).

---

## 🔄 3. Step-by-Step Data Flow (How it works under the hood)

```
[React Frontend] (Inputs: Name & Bio)
       │
       ▼  (POST /api/run)
[Express Server] (Initiates loop in background)
       │
       ▼  (Start loop in agentLoop.js)
[Playwright Browser] ──> Captures Screenshot & scans DOM coordinates (x, y)
       │
       ▼  (Sends Base64 Image + Coordinates list)
[OpenAI GPT-4o-mini] ──> Visually identifies Name & Bio fields
       │
       ▼  (Responds with JSON action: "click_on_screen" at coordinates)
[Playwright Browser] ──> Clicks (x, y), focuses input, & types text!
       │
       ▼  (Repeats cycle, streaming updates back via Server-Sent Events)
[React Frontend] ──> Updates screen screenshot and scrolls terminal logs live!
```

1.  **User Trigger**: You type "Kaif" and a description on the React dashboard, then click **Launch**.
2.  **Server Alert**: React makes a post call to the Express server (`server.js`). The server replies instantly saying "Started!", so the page doesn't freeze.
3.  **Browser Launch**: In the background, `agentTools.js` launches a **Playwright Chromium browser** and goes to the Shadcn UI forms page.
4.  **Scanning and Screenshotting**:
    *   `agentTools.js` takes a picture of the webpage.
    *   A special script runs inside the webpage to measure the exact center coordinate `(x, y)` of every input box, button, and text area.
5.  **AI Analysis**:
    *   The screenshot image and list of coordinates are packed up and sent to **GPT-4o-mini** via the OpenAI API.
    *   GPT-4o-mini inspects the picture, sees the labels "Username" and "Bio", and matching them with our targets, decides: *"I need to click on coordinates (450, 310) to select the Username field."*
6.  **Tool Execution**:
    *   `agentLoop.js` reads the AI's decision.
    *   It tells Playwright: *"Move the mouse to x=450, y=310, click, and then type 'Kaif'!"*
7.  **Real-Time Streaming**: As the browser does these actions, the server sends the latest logs and screenshots to React using **Server-Sent Events (SSE)**. The user watches it happen live on their screen!
8.  **Completion**: The agent repeats this loop, filling the Description field, clicking the "Update profile" button, and then calling `finish` once the form is successfully submitted.

---

## 💻 4. Important Code Snippets & Simple Explanations

Here are the key parts of the code you should focus on. If your professor asks, *"How did you implement this?"*, you can show these exact snippets.

### Snippet A: Dynamic Coordinate Mapping (The "Secret Sauce")
Instead of hardcoding brittle selectors, we inject this JavaScript code directly into the webpage to locate interactive elements.

*Found in: `agentLoop.js`*
```javascript
const rect = el.getBoundingClientRect();

// Find center coordinate
const x = Math.round(rect.left + rect.width / 2);
const y = Math.round(rect.top + rect.height / 2);

// Search for associated labels
let label = "";
if (el.id) {
  const labelEl = document.querySelector(`label[for="${el.id}"]`);
  if (labelEl) label = labelEl.innerText;
}
```

*   **Why we wrote this**: 
    *   `getBoundingClientRect()` tells us exactly where the element is located relative to the screen viewport (left edge, right edge, width, height).
    *   Adding `rect.left + rect.width / 2` finds the exact **mathematical center** of the input field.
    *   `document.querySelector('label[for=...]')` lets us find the textual label (e.g. "Username") pointing to that input field.
    *   We package this up so the AI gets a list like: *"There is a text field labeled 'Username' at coordinate (x: 420, y: 280)"*. The AI can now make highly accurate click decisions!

---

### Snippet B: Real-Time Event Streaming (SSE)
We stream logs and screenshots to React using Server-Sent Events, which is much simpler than full WebSockets.

*Found in: `server.js`*
```javascript
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);
});
```

*   **Why we wrote this**:
    *   `text/event-stream` tells the browser frontend to keep the HTTP connection open so the server can push raw text down the wire at any time.
    *   Whenever our agent takes a new screenshot or completes a step, it loops through the `sseClients` array and pushes a JSON string.
    *   This keeps the app extremely fast, lightweight, and requires **no extra npm libraries** (keeping the code clean and student-like!).

---

### Snippet C: Typing keys into Focused Elements
This maps directly to the `send_keys(text)` required tool function.

*Found in: `agentTools.js`*
```javascript
export async function send_keys(text) {
  if (!page) throw new Error("Browser is not open.");
  
  await page.keyboard.type(text, { delay: 50 });
}
```

*   **Why we wrote this**:
    *   In a coordinate-based system, we click at `(x, y)` to focus an input box. Once focused, we type into it.
    *   `page.keyboard.type` simulates physical keyboard inputs rather than forcing a value via JS.
    *   `delay: 50` adds a tiny 50ms pause between each letter, making it look and act like a real student typing, which bypasses bot detectors easily!

---

## 🧠 5. Key Features Implemented
1.  **Full Tool Suite**: Implemented all required operations: `take_screenshot`, `open_browser`, `navigate_to_url`, `click_on_screen(x,y)`, `send_keys`, `scroll`, `double_click` as neat, separate, reusable functions.
2.  **GPT-4o-mini Integration**: Uses vision to inspect the page state visually, ensuring intelligent, context-aware decision making.
3.  **Beautiful Dashboards**: Built a curated UI. It includes linear gradients, custom dark backgrounds, glassmorphism panel blur effects, real-time scrollable terminal console, and an active blinking recording status dot.
4.  **Robust Error Handling**: If OpenAI fails, the internet disconnects, or a page times out, the browser closes safely, preventing memory leaks, and writes a red error banner on the console log.

---

## 💡 6. Major Assumptions Made
1.  **Target Form Fields**: We assumed that the "Name" field matches the "Username" field and the "Description" field matches the "Bio" textarea field on the Shadcn react-hook-form demo. The AI handles this translation beautifully.
2.  **API Environment**: We assumed that the user has a valid OpenAI API key loaded in the `.env` file to trigger the GPT-4o-mini analysis.
3.  **Headless Execution**: We assumed headless mode is preferred for general development and viva setup to avoid popping up massive browser windows during execution, though visual screens are captured and shown perfectly in the React UI!

---

## 🚀 7. Step-by-Step Guide: How to run it for your Professor

Be ready to present this during your viva!

1.  **Open terminal** and navigate to your folder:
    ```bash
    cd FinalProject
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    npx playwright install chromium
    ```
3.  **Configure API Key**: Show your professor your `.env` file containing your `OPENAI_API_KEY`.
4.  **Start the app**:
    ```bash
    npm run dev
    ```
5.  **Open Browser**: Go to `http://localhost:5173/` in your Chrome browser.
6.  **Demo**:
    *   Show off the stunning, sleek dark dashboard!
    *   Point out the **Project Architecture & Q&A Panel** at the bottom, proving you fully document your work.
    *   Type your name (e.g. `Kaif`) and a customized bio in the fields.
    *   Click **Launch Automation Agent**.
    *   Watch the live browser viewport overlay light up and stream screenshots.
    *   Point to the **Agent Console Log** terminal as it writes detailed decisions (e.g., `"Clicking at (x, y) to focus Username field"`, `"Typing 'Kaif'"`, etc.) dynamically.
    *   Celebrate with your professor as it displays a success message!

---

## 🔮 8. Possible Future Improvements (Great for high marks!)
If the professor asks: *"How would you improve this in the future?"*, give these answers for extra credit:
1.  **Visual Coordinate Highlighting**: Overlay highlighted boxes or circles onto the live screenshots to visually show exactly where the AI decided to click at every step.
2.  **Multi-Tab Support**: Allow the agent to navigate across multiple browser tabs, handle dialog popups, and automatically input credentials when encountering authentication walls.
3.  **Self-Correcting Actions**: If the agent clicks a button but nothing happens (e.g. loading takes too long), it should detect the absence of state change, backtrace, scroll, or re-click autonomously.

Good luck! You are fully prepared to secure 100% on your viva evaluation! 🎓
