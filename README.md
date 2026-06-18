# Website Automation Agent (Assignment 04)

This repository contains an autonomous website control and browser automation agent built for university Assignment 04. It navigates to a target URL, dynamically identifies form inputs (Name/Username and Bio/Description), and fills them out autonomously using Playwright browser actions and multimodal AI reasoning.

## Tech Stack
- **Backend**: Node.js, Express, Playwright, OpenAI SDK
- **Frontend**: React (Vite), Vanilla CSS, Server-Sent Events (SSE)
- **AI Model**: OpenAI GPT-4o-mini (Multimodal)

---

## Key Features
1. **Isolated Modular Tools**: Implements exact capabilities (`open_browser`, `take_screenshot`, `navigate_to_url`, `click_on_screen`, `send_keys`, `scroll`, `double_click`) as discrete, callable functions in `agentTools.js`.
2. **Vision-Language Orchestration Loop**: The agent continuously captures a visual screenshot and matches it with a custom DOM element coordinate map. The AI analyzes where the input fields are, and decides on sequential coordinate-based mouse moves and keystroke entries.
3. **No Hardcoded Selectors**: The system does not use brittle CSS/XPath selectors that break when a website shifts its layout. It dynamically detects active focus elements and interacts via visual coordinates.
4. **Real-time Monitoring Dashboard**: Streams live-updating screenshots and detailed reasoning logs from the background Playwright thread to the React front-end dashboard using standard **Server-Sent Events (SSE)**.

---

## Folder Structure
```bash
FinalProject/
├── .env                  # Project environment variables (OPENAI_API_KEY)
├── .env.example          # Sample environment format
├── package.json          # Node dependencies and npm runners
├── vite.config.js        # React frontend bundler setup
├── server.js             # Express API server & SSE streaming hub
├── agentTools.js         # Core browser action tools utilizing Playwright
├── agentLoop.js          # Intelligent decision orchestrator using GPT-4o-mini
├── index.html            # Frontend Entry HTML document
├── README.md             # Standard developer instructions
├── README_EXPLANATION.md # Simple Student Viva preparation guide
└── src/
    ├── main.jsx          # React app entry loader
    ├── App.jsx           # Premium React main dashboard
    └── App.css           # Vanilla CSS styles, variables, grids & animations
```

---

## Installation & Setup

Follow these simple steps to run the application locally.

### 1. Install Node.js Dependencies
Navigate to the `FinalProject` directory in your terminal and install all required packages:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root of the `FinalProject` directory (a copy has already been created for you during setup) and input your OpenAI API Key:
```env
OPENAI_API_KEY="your-openai-api-key-here"
PORT=5001
```

### 3. Install Playwright Browsers
To enable Playwright to launch Chromium in headless/headed modes, install the browser binaries:
```bash
npx playwright install chromium
```

---

## Running the Application

You can launch both the React frontend (port 5173) and the Express backend (port 5001) simultaneously using a single command:
```bash
npm run dev
```

1. Open your browser and navigate to the frontend dashboard: `http://localhost:5173/`
2. Enter your custom **Name** and **Description** parameter inputs.
3. Click the **Launch Automation Agent** button.
4. Watch the agent open the Playwright session, visually examine the Shadcn UI page, click coordinates, send keyboard keystrokes, and complete the form submission live!
