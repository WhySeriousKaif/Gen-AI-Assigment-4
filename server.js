import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runAgentLoop, requestAgentTermination } from './agentLoop.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Locate directories using ESM file URL conversion
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Active SSE client connections
let sseClients = [];

/**
 * Server-Sent Events (SSE) Endpoint.
 * Allows the browser frontend to establish a persistent real-time streaming channel.
 * Express will push visual updates and execution logs over this connection.
 */
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Flush headers immediately to establish stream
  res.flushHeaders();

  console.log(`[Server] Frontend connected to SSE stream. Total clients: ${sseClients.length + 1}`);
  sseClients.push(res);

  // Remove connection on client disconnect
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
    console.log(`[Server] Frontend disconnected. Active clients: ${sseClients.length}`);
  });
});

/**
 * Helper to broadcast JSON messages to all listening SSE clients.
 * @param {Object} data The event data (logs, screenshots, status reports).
 */
function broadcastSSE(data) {
  sseClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error("[Server] Failed to write to SSE client socket:", err.message);
    }
  });
}

/**
 * API Route: Triggers the visual AI agent run.
 * Receives the target form parameters (Name and Description) from the UI.
 */
app.post('/api/run', (req, res) => {
  const { name, description, provider, model, apiKey, targetUrl, maxSteps, objective, mode } = req.body;

  const destinationUrl = targetUrl || "https://ui.shadcn.com/docs/forms/react-hook-form";
  const stepLimit = parseInt(maxSteps) || 15;
  
  let finalObjective = '';
  if (mode === 'form') {
    finalObjective = `Your target is to fill out the form on this page with these parameters:
- Target Name/Username to type: "${name}"
- Target Description/Bio to type: "${description}"

To achieve this, identify the "Name" (usually labeled "Username" on this page) and "Description" (usually labeled "Bio") fields, click each to focus it, use "send_keys" to input the text, and click the submit or "Update profile" button to submit the form.`;
  } else {
    finalObjective = objective;
  }

  if (!finalObjective) {
    return res.status(400).json({
      success: false,
      message: "A Task Objective or Form parameters are required to launch the pilot."
    });
  }

  // Set running state on UI
  broadcastSSE({ type: 'status', status: 'running' });
  broadcastSSE({ type: 'log', message: `[Server] Launching Agent automation task on ${destinationUrl}...` });
  broadcastSSE({ type: 'log', message: `[Server] Parameters: Engine=${provider || 'openai'}, Model=${model || 'gpt-4o-mini'}, MaxSteps=${stepLimit}` });
  broadcastSSE({ type: 'log', message: `[Server] Task Loaded: "${finalObjective.slice(0, 100)}${finalObjective.length > 100 ? '...' : ''}"` });

  runAgentLoop({
    targetUrl: destinationUrl,
    objective: finalObjective,
    provider,
    modelSelected: model,
    apiKeySelected: apiKey,
    maxSteps: stepLimit,
    onStepUpdate: (update) => {
      broadcastSSE(update);
    }
  }).catch((err) => {
    console.error("[Server] Critical Agent execution failure:", err);
    broadcastSSE({ type: 'status', status: 'failed', error: err.message });
  });

  res.status(200).json({
    success: true,
    message: "Agent initiated successfully in background."
  });
});

/**
 * API Route: Requests manual termination of the active pilot session.
 */
app.post('/api/terminate', (req, res) => {
  console.log("[Server] Manual termination requested by frontend.");
  requestAgentTermination();
  
  broadcastSSE({ type: 'log', message: `[Server] Termination request received. Safely aborting loop execution step...` });
  
  res.status(200).json({
    success: true,
    message: "Termination broadcasted."
  });
});

// Serve frontend React static assets in production
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to React index.html for modern SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Launch server listener
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Server running in Development mode on port ${PORT}`);
  console.log(`🔌 SSE stream active at http://localhost:${PORT}/api/stream`);
  console.log(`====================================================`);
});
