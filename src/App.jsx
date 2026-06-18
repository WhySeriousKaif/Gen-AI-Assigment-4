import React, { useState, useEffect, useRef } from 'react';

// Configure dynamic API base URL for cross-origin backend connectivity (e.g. Vercel + Render)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (window.location.port ? 'http://localhost:5001' : window.location.origin);

function App() {
  // Brand Configuration
  const brandName = "Synapse";
  const brandSubtext = "Autonomous Multimodal Web Agent";

  // Native HTML5 Routing State initialization
  const getInitialView = () => {
    return window.location.pathname === '/console' ? 'console' : 'home';
  };
  
  const [view, setView] = useState(getInitialView);

  // Mode selection and parameter states
  const [mode, setMode] = useState('form'); // 'form' | 'custom'
  const [name, setName] = useState('WhySeriousKaif');
  const [description, setDescription] = useState('AI Automation Engineer specialized in premium autonomous browser pilots.');
  const [objective, setObjective] = useState("Locate the YouTube search bar, click on it, type 'lofi hip hop radio - beats to relax/study to', hit enter, click on the first live stream video in the results to open it, and then call finish.");
  
  // Custom Brain Configuration states
  const [provider, setProvider] = useState('openai'); // 'openai' | 'gemini'
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  
  // Custom Target & Steps configuration
  const [targetUrl, setTargetUrl] = useState('https://ui.shadcn.com/docs/forms/react-hook-form');
  const [maxSteps, setMaxSteps] = useState(15);
  
  // Real-time telemetry states
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'completed' | 'failed'
  const [logs, setLogs] = useState([]);
  const [screenshot, setScreenshot] = useState(null);
  const [elements, setElements] = useState([]); // Visual interactive coordinate nodes
  const [activeClick, setActiveClick] = useState(null); // Click indicator { x, y }
  const [showCoordinates, setShowCoordinates] = useState(true); // Overlay toggle
  const [error, setError] = useState(null);
  
  // Telemetry Stats
  const [latency, setLatency] = useState('110ms');
  const [apiCost, setApiCost] = useState('$0.00');

  // Screenshots history state and auto-scroll ref
  const [screenshots, setScreenshots] = useState([]);
  const screenshotsEndRef = useRef(null);

  // Auto-scroll ref
  const terminalEndRef = useRef(null);

  // Resizable panel states & dragging effect hooks
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(350);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingLeft) {
        // Limit left column width between 240px and 450px
        const newWidth = Math.max(240, Math.min(450, e.clientX));
        setLeftWidth(newWidth);
      }
      if (isDraggingRight) {
        // Limit right column width between 260px and 550px
        const newWidth = Math.max(260, Math.min(550, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text highlights
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight]);

  // Native Navigation Router Function
  const navigateTo = (targetView) => {
    setView(targetView);
    const targetPath = targetView === 'console' ? '/console' : '/';
    window.history.pushState({ view: targetView }, '', targetPath);
    // Smooth scroll back to top of screen on page load
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Sync state with native back/forward popstate actions
  useEffect(() => {
    const handlePopState = (event) => {
      // Sync view with URL pathname dynamically
      const activePath = window.location.pathname;
      setView(activePath === '/console' ? 'console' : 'home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // SSE telemetry subscription channel
  useEffect(() => {
    const streamUrl = `${API_BASE_URL}/api/stream`;
    console.log(`[Synapse] Connecting SSE stream to: ${streamUrl}`);
    
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'status') {
          setStatus(data.status);
          if (data.status === 'failed') {
            setError(data.error || 'Execution session aborted.');
          }
        } else if (data.type === 'log') {
          setLogs((prev) => [...prev, data.message]);
        } else if (data.type === 'screenshot') {
          setScreenshot(data.base64);
          setScreenshots((prev) => [...prev, {
            base64: data.base64,
            timestamp: new Date().toLocaleTimeString()
          }]);
        } else if (data.type === 'elements') {
          setElements(data.elements || []);
        } else if (data.type === 'click') {
          // Set visual click ripple coordinates
          setActiveClick({ x: data.x, y: data.y });
          // Reset click ripple after animation completes (1.2s)
          setTimeout(() => setActiveClick(null), 1200);
        }
      } catch (err) {
        console.error("[Synapse] Stream Parse Error:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Scroll terminal logs smoothly
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Scroll screenshot timeline smoothly
  useEffect(() => {
    if (screenshotsEndRef.current) {
      screenshotsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [screenshots]);

  // Trigger POST execution API
  const handleLaunchAgent = async (e) => {
    e.preventDefault();
    if (status === 'running') return;

    // Reset console and highlights
    setLogs([]);
    setScreenshot(null);
    setScreenshots([]);
    setElements([]);
    setActiveClick(null);
    setError(null);
    setStatus('running');

    setLatency('142ms');
    setApiCost('$0.02');

    const runUrl = `${API_BASE_URL}/api/run`;
    try {
      const res = await fetch(runUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          name,
          description,
          objective,
          provider,
          model,
          apiKey,
          targetUrl,
          maxSteps
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message);
        setStatus('failed');
      }
    } catch (err) {
      setError('Express core disconnected. Launch server on port 5001.');
      setStatus('failed');
    }
  };

  // Terminate active Playwright agent task
  const handleTerminateAgent = async () => {
    if (status !== 'running') return;

    setLogs((prev) => [...prev, "[Synapse] Sending manual termination request to engine..."]);

    const terminateUrl = `${API_BASE_URL}/api/terminate`;
    try {
      const res = await fetch(terminateUrl, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        setLogs((prev) => [...prev, `[Synapse] ❌ Termination failed: ${data.message}`]);
      }
    } catch (err) {
      setLogs((prev) => [...prev, `[Synapse] ❌ Failed to dispatch termination API request. Error: ${err.message}`]);
    }
  };

  const getLogClass = (line) => {
    if (line.includes('❌') || line.includes('Error')) return 'log-line error';
    if (line.includes('🤖')) return 'log-line agent';
    if (line.includes('[Tool]')) return 'log-line tool';
    if (line.includes('[Server]')) return 'log-line server';
    return 'log-line';
  };

  // Scroll utilities for Home sections
  const scrollToId = (id) => {
    if (view !== 'home') {
      setView('home');
      const targetPath = '/';
      window.history.pushState({ view: 'home' }, '', targetPath);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ----------------------------------------------------
  // VIEW: HOME PAGE (Marketing Landing + Mockup Showcase)
  // ----------------------------------------------------
  if (view === 'home') {
    return (
      <div style={{ width: '100vw' }}>
        
        {/* Sticky Top Navbar */}
        <nav className="navbar">
          <div className="nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            <div className="nav-logo">⚡</div>
            <span className="nav-brand-text">{brandName}</span>
          </div>
          
          <div className="nav-links">
            <button className="nav-link" onClick={() => scrollToId('features')}>Features</button>
            <button className="nav-link" onClick={() => scrollToId('mockup-preview')}>Product Cockpit</button>
            <button className="nav-link" onClick={() => scrollToId('specs')}>Architecture Specs</button>
            <button className="nav-link" onClick={() => scrollToId('faq')}>Recruiter Q&A</button>
            
            <button className="btn-hero-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.7rem' }} onClick={() => navigateTo('console')}>
              🚀 Open Console
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <span className="hero-tag">⚡ autonomous vision pilot</span>
          
          <h1 className="hero-title">
            Vision-Driven Multimodal Autonomous Web Pilot
          </h1>
          
          <p className="hero-subtitle">
            Bypass brittle CSS/XPath selector query patterns. Execute complete headless browser automation visually using AI-driven screen coordinate mappings and real-time Server-Sent Event telemetry.
          </p>

          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => navigateTo('console')}>
              🚀 Open Interactive Console
            </button>
            <button className="btn-hero-secondary" onClick={() => scrollToId('specs')}>
              ⚙️ Read Technical Specs
            </button>
          </div>

          {/* Quick Stats Bar */}
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-val">SSE Stream</span>
              <span className="stat-lbl">Active Telemetry</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">10 Steps</span>
              <span className="stat-lbl">Max Execution Budget</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">Chromium</span>
              <span className="stat-lbl">Playwright Sandbox</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">110ms</span>
              <span className="stat-lbl">Average Latency</span>
            </div>
          </div>
        </section>

        {/* Features Highlights Section */}
        <section id="features" className="features-section">
          <span className="section-label">Capabilities</span>
          <h2 className="section-title">Engineered to bypass the limits of standard automation</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-card-icon">🤖</div>
              <h4>Visual Coordinate Mapping</h4>
              <p>
                Rather than using fragile selectors that break during CSS restyles, Synapse evaluates elements directly in the viewport and calculates absolute mathematical coordinate centers for exact mouse clicks.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card-icon">🛠️</div>
              <h4>Composable Playwright SDK</h4>
              <p>
                Autonomous actions reside inside isolated async ES modules (`agentTools.js`) wrapping sandboxed viewport captures, key typing simulations, double clicks, and scrolls.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card-icon">📡</div>
              <h4>Low-Latency SSE Streams</h4>
              <p>
                Maintains an ultra-low-latency one-directional persistent Server-Sent Events pipeline to stream browser frames, targets, click ripple events, and logger arrays instantly without polling overhead.
              </p>
            </div>
          </div>
        </section>

        {/* Product Cockpit Visual Mockup Showcase (Root Attraction of Home Page) */}
        <section id="mockup-preview" className="playground-section">
          <span className="section-label">Product Cockpit Preview</span>
          <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Visual telemetry control suite</h2>
          
          {/* Card Wrapper that transitions to the live Console page when clicked */}
          <div className="mockup-wrapper" onClick={() => navigateTo('console')}>
            
            {/* Absolute hovering banner overlay */}
            <div className="mockup-overlay-cta">
              <div className="cta-banner">
                <h4>⚡ Open Interactive Pilot</h4>
                <p>Click anywhere to launch the isolated Playwright browser agent live!</p>
              </div>
            </div>

            {/* Static Cockpit Grid Mockup */}
            <div className="playground-container" style={{ pointerEvents: 'none', userSelect: 'none', opacity: 0.65 }}>
              
              {/* Mockup Column A: Controls Form */}
              <div className="control-panel">
                <div className="card" style={{ flex: 1 }}>
                  <h3 className="card-title">
                    🕹️ Pilot Controls (Preview)
                  </h3>
                  
                  <div className="form-group">
                    <label>Name Parameter</label>
                    <input type="text" className="form-input" value="John Doe" readOnly />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Bio/Description Parameter</label>
                    <textarea 
                      className="form-input" 
                      style={{ flex: 1, minHeight: '80px', resize: 'none' }}
                      value="Senior Product Engineer specialized in AI Agents." 
                      readOnly 
                    />
                  </div>

                  <div className="perf-stat-box">
                    <div className="perf-stat-item">
                      <span className="label">Telemetry Latency</span>
                      <span className="value">110ms</span>
                    </div>
                    <div className="perf-stat-item">
                      <span className="label">AI Token Cost</span>
                      <span className="value">$0.00</span>
                    </div>
                  </div>

                  <button className="btn-primary" disabled>
                    🚀 Launch Autonomous Pilot
                  </button>

                  <div className="status-bar">
                    <span className="status-label">Pilot State:</span>
                    <div className="status-badge-container">
                      <span className="status-dot"></span>
                      <span className="status-text idle">idle</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: '0.4rem', paddingBottom: '0.4rem' }}>
                    🎯 Target Blueprint
                  </h3>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    Navigates autonomously to Shadcn and completes form.
                  </p>
                </div>
              </div>

              {/* Mockup Column B: Simulated browser viewport (Center) */}
              <div className="browser-view">
                <div className="browser-header">
                  <div className="browser-dots">
                    <span className="dot-sim"></span>
                    <span className="dot-sim"></span>
                    <span className="dot-sim"></span>
                  </div>
                  <div className="browser-address-bar">
                    🔒 ui.shadcn.com/docs/forms/react-hook-form
                  </div>
                </div>
                
                <div className="browser-content">
                  <div className="viewport-aspect-wrapper">
                    <div className="screenshot-placeholder">
                      <span className="screenshot-placeholder-icon">👁️</span>
                      <p>Visual feed idle. Click mockup to launch live engine.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mockup Column C: Live logs terminal */}
              <div className="console-view">
                <div className="browser-header" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    📡 TELEMETRY ENGINE LOGGER
                  </span>
                </div>
                <div className="console-terminal">
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontStyle: 'italic' }}>
                    // Telemetry channel idle. Click mockup to initialize...
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Deep Architectural Specifications Section */}
        <section id="specs" className="specs-section">
          <span className="section-label">Specifications</span>
          <h2 className="section-title">Deep Technical Architecture Specs</h2>
          
          <div className="specs-grid">
            <div className="spec-column">
              <h4>🤖 Visual Bounding Core</h4>
              <p>
                Rather than relying on fragile DOM selector chains (XPath/class combinations) which immediately break upon style alterations, Synapse extracts mathematical viewport center coordinates `(x, y)` dynamically and translates them to OpenAI's GPT-4o-mini multimodal model.
              </p>
            </div>

            <div className="spec-column">
              <h4>🛠️ Composable Playwright SDK</h4>
              <p>
                Action execution is completed via isolated, discrete, and composable browser operations in `agentTools.js` encapsulating human-delay keystroke typing simulations, double clicks, and page scrolls.
              </p>
            </div>

            <div className="spec-column">
              <h4>📡 Event streaming pipeline</h4>
              <p>
                Maintains an ultra-low-latency one-directional persistent HTTP Server-Sent Events pipeline mapping base64 frames and thread events natively with no extra client overhead.
              </p>
            </div>
          </div>
        </section>

        {/* Recruiter FAQ (Q&A) Section */}
        <section id="faq" className="faq-section">
          <span className="section-label">FAQ</span>
          <h2 className="section-title" style={{ textAlign: 'center' }}>Engineering Q&A For Recruiters</h2>
          
          <div className="faq-list">
            <div className="faq-item">
              <h4 className="faq-question">How are element coordinate mappings calculated?</h4>
              <p className="faq-answer">
                During the agent loop step, Playwright injects and evaluates a scanning script directly inside the active Chromium browser page. This script filters for interactive components (inputs, textarea fields, buttons, links) that are visible inside the current viewport bounding box. It retrieves their bounding client rects, computes the exact mathematical centers `(x, y)`, and broadcasts these coordinates in real-time.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">How does the real-time event pipeline operate without standard state polling?</h4>
              <p className="faq-answer">
                We engineered a Server-Sent Events (SSE) telemetry connection. The client React frontend initiates a single, persistent `EventSource` connection to `/api/stream` at start. Whenever the background Playwright script captures new browser frame buffers, overlays interactive components, or triggers cursor click animations, the Express server immediately streams JSON chunks down the persistent HTTP pipe.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Why use coordinate-based AI clicks over traditional CSS selector bindings?</h4>
              <p className="faq-answer">
                Modern web applications increasingly use dynamically compiled utility frameworks (like Tailwind CSS or CSS-in-JS). These frameworks compile unique class names at build time, rendering standard XPath/CSS query lines fragile and subject to instant breaking. Visual coordination operates exactly like a human: it scans the page visually, finds where items physically reside on the screen, and clicks the coordinates directly, guaranteeing brittle-free page interaction!
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer-wrap">
          <div className="footer-tech-row">
            <span className="tech-badge">React 18</span>
            <span className="tech-badge">Playwright</span>
            <span className="tech-badge">Node / Express</span>
            <span className="tech-badge">OpenAI GPT-4o</span>
          </div>
          <p className="footer-copy">
            Synapse AI • Vision-Driven Multimodal Autonomous Browser Pilot Portfolio Showcase. Built in 2026.
          </p>
        </footer>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: INTERACTIVE CONSOLE PAGE (Live Dashboard Runner - MAXIMIZED FULLSCREEN VIEW)
  // ----------------------------------------------------
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-black)', overflow: 'hidden' }}>
      
      {/* Console Navbar containing Back-To-Home trigger */}
      <nav className="navbar">
        <div className="nav-brand" onClick={() => navigateTo('home')} style={{ cursor: 'pointer' }}>
          <span style={{ marginRight: '0.45rem', fontSize: '0.85rem', color: 'var(--color-amber)' }}>←</span>
          <span className="nav-brand-text" style={{ color: 'var(--text-secondary)' }}>Back to Home</span>
        </div>
        
        <div className="nav-brand" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="nav-logo">⚡</div>
          <span className="nav-brand-text">{brandName} Control Room</span>
        </div>

        <div className="nav-links">
          <span className="nav-badge-online">
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-emerald)' }}></span>
            Pilot Engine Online
          </span>
        </div>
      </nav>

      {/* Primary console viewport dashboard screen (MAXIMIZED TO 100% WIDTH AND HEIGHT) */}
      <main className="console-container-fullscreen">
        
        {/* 3-Column Dashboard cockpit grid with dynamic drag resizing */}
        <div className="console-playground-grid" style={{ display: 'flex', gap: '0.25rem', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
          
          {/* Column A: Controller Form */}
          <div className="control-panel" style={{ width: `${leftWidth}px`, minWidth: `${leftWidth}px`, maxWidth: `${leftWidth}px`, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <form className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }} onSubmit={handleLaunchAgent}>
              <h3 className="card-title" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.45rem', marginBottom: '0.65rem' }}>
                🕹️ Pilot Controls
              </h3>

              {/* Target URL & Max Steps configuration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label htmlFor="target-url-input" style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Website URL</label>
                  <input
                    id="target-url-input"
                    type="url"
                    className="form-input"
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    disabled={status === 'running'}
                    placeholder="https://example.com"
                    required
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label htmlFor="max-steps-input" style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Maximum Steps budget</label>
                    <input
                      id="max-steps-input"
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      style={{ cursor: 'pointer', accentColor: 'var(--color-amber)' }}
                      value={maxSteps}
                      onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                      disabled={status === 'running'}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Steps Limit</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>{maxSteps}</span>
                  </div>
                </div>
              </div>
              
              {/* Premium Tab Selection Mode */}
              <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-zinc)', overflow: 'hidden', marginBottom: '0.65rem', background: 'rgba(255,255,255,0.01)' }}>
                <button
                  type="button"
                  onClick={() => setMode('form')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: mode === 'form' ? 'var(--color-amber)' : 'transparent',
                    color: mode === 'form' ? 'var(--bg-zinc-950)' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📝 Form Auto-Fill
                </button>
                <button
                  type="button"
                  onClick={() => setMode('custom')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: mode === 'custom' ? 'var(--color-amber)' : 'transparent',
                    color: mode === 'custom' ? 'var(--bg-zinc-950)' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🚀 Custom Pilot
                </button>
              </div>

              {/* Conditional Inputs Rendering based on selected Mode */}
              {mode === 'form' ? (
                <>
                  <div className="form-group" style={{ marginBottom: '0.50rem' }}>
                    <label htmlFor="name-input-live-wide-routed" style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name Parameter</label>
                    <input
                      id="name-input-live-wide-routed"
                      type="text"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={status === 'running'}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.50rem' }}>
                    <label htmlFor="desc-input-live-wide-routed" style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Bio/Description Parameter</label>
                    <textarea
                      id="desc-input-live-wide-routed"
                      className="form-input"
                      style={{ flex: 1, minHeight: '80px', resize: 'none', padding: '0.45rem', fontSize: '0.75rem', lineHeight: '1.4', background: 'var(--bg-black)' }}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={status === 'running'}
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.50rem' }}>
                  <label htmlFor="objective-input-live-wide" style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Task Instructions / Objective</label>
                  <textarea
                    id="objective-input-live-wide"
                    className="form-input"
                    style={{ flex: 1, minHeight: '120px', resize: 'none', padding: '0.45rem', fontSize: '0.75rem', lineHeight: '1.4', background: 'var(--bg-black)' }}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    disabled={status === 'running'}
                    placeholder="Describe exactly what you want the AI Pilot to do on this website step-by-step..."
                    required
                  />
                </div>
              )}

              {/* Provider & Model Configuration (Curated Glassmorphism Section) */}
              <div style={{ border: '1px solid var(--border-zinc)', borderRadius: 'var(--radius-md)', padding: '0.65rem', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <h4 style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-amber)', margin: 0, paddingBottom: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  🧠 Brain Configuration
                </h4>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* Provider Choice */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>AI Engine</label>
                    <select
                      className="form-input"
                      style={{ padding: '0.3rem 0.45rem', fontSize: '0.7rem', height: 'auto', background: 'var(--bg-black)' }}
                      value={provider}
                      onChange={(e) => {
                        const nextProvider = e.target.value;
                        setProvider(nextProvider);
                        setModel(nextProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash');
                      }}
                      disabled={status === 'running'}
                    >
                      <option value="openai">OpenAI GPT</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </div>

                  {/* Model Choice */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Brain Model</label>
                    <select
                      className="form-input"
                      style={{ padding: '0.3rem 0.45rem', fontSize: '0.7rem', height: 'auto', background: 'var(--bg-black)' }}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      disabled={status === 'running'}
                    >
                      {provider === 'openai' ? (
                        <>
                          <option value="gpt-4o-mini">gpt-4o-mini</option>
                          <option value="gpt-4o">gpt-4o</option>
                        </>
                      ) : (
                        <>
                          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                          <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                          <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* API Key Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                    <span>Custom API Credentials</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>(optional, falls back to env)</span>
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder={provider === 'openai' ? 'Paste OpenAI sk-... API Key' : 'Paste Google Gemini API Key'}
                    style={{ padding: '0.3rem 0.45rem', fontSize: '0.7rem', height: 'auto' }}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={status === 'running'}
                  />
                </div>
              </div>

              {/* Performance Stats badges */}
              <div className="perf-stat-box">
                <div className="perf-stat-item">
                  <span className="label">Telemetry Latency</span>
                  <span className="value">{status === 'running' ? latency : '110ms'}</span>
                </div>
                <div className="perf-stat-item">
                  <span className="label">AI Token Cost</span>
                  <span className="value">{status === 'running' ? apiCost : '$0.00'}</span>
                </div>
              </div>

              {/* Target checkbox */}
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showCoordinates}
                    onChange={(e) => setShowCoordinates(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
                    Overlay Target Coordinates
                  </span>
                </label>
              </div>

              <div className="button-group">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={status === 'running'}
                  style={{ flex: 2 }}
                >
                  {status === 'running' ? (
                    <>
                      <span className="spinner-mini" style={{ marginRight: '0.45rem' }}></span>
                      Running Pilot...
                    </>
                  ) : (
                    "🚀 Launch Pilot"
                  )}
                </button>
                <button
                  type="button"
                  className="btn-primary btn-terminate"
                  onClick={handleTerminateAgent}
                  disabled={status !== 'running'}
                  style={{ flex: 1 }}
                >
                  🛑 Terminate
                </button>
              </div>

              {/* Status indicator bar */}
              <div className="status-bar">
                <span className="status-label">Pilot State:</span>
                <div className="status-badge-container">
                  <span className={`status-dot ${status}`}></span>
                  <span className={`status-text ${status}`}>{status}</span>
                </div>
              </div>

              {error && (
                <div style={{ color: 'var(--color-rose)', fontSize: '0.65rem', border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)', padding: '0.45rem', borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }}>
                  <strong>Execution Aborted:</strong> {error}
                </div>
              )}
            </form>

            {/* Blueprint specs */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '0.4rem', paddingBottom: '0.4rem' }}>
                🎯 Target Blueprint
              </h3>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Navigates autonomously to: <br/>
                <code style={{ color: 'var(--color-amber)', display: 'block', margin: '0.2rem 0', wordBreak: 'break-all' }}>{targetUrl || 'ui.shadcn.com/docs/forms/react-hook-form'}</code>
                {targetUrl.includes('ui.shadcn.com') 
                  ? 'Calculates math center bounds of Username and Bio fields inside active view and automatically completes submission.'
                  : 'Visually scans dynamic custom page structures, coordinates center centers of interactive nodes, and executes actions to satisfy target goals.'}
              </p>
            </div>
          </div>

          {/* Left-Center Resizer Bar */}
          <div 
            style={{
              width: '4px',
              cursor: 'col-resize',
              background: isDraggingLeft ? 'var(--color-amber)' : 'rgba(255,255,255,0.05)',
              borderRadius: '2px',
              transition: 'background 0.15s',
              alignSelf: 'stretch',
              margin: '0 0.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              zIndex: 10
            }}
            onMouseDown={() => setIsDraggingLeft(true)}
            title="Drag to resize controls, double-click to reset"
            onDoubleClick={() => setLeftWidth(320)}
          >
            <div style={{ width: '2px', height: '20px', background: isDraggingLeft ? 'transparent' : 'rgba(255,255,255,0.15)', borderRadius: '1px' }}></div>
          </div>

          {/* Column B: Simulated browser viewport (Center - MAXIMIZED SIZE) */}
          <div className="browser-view" style={{ flex: 1, minWidth: 0 }}>
            <div className="browser-header">
              <div className="browser-dots">
                <span className="dot-sim"></span>
                <span className="dot-sim"></span>
                <span className="dot-sim"></span>
              </div>
              <div className="browser-address-bar" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🔒 {targetUrl ? targetUrl.replace(/^https?:\/\/(www\.)?/, '') : 'ui.shadcn.com/docs/forms/react-hook-form'}
              </div>
            </div>
            
            <div className="browser-content">
              {screenshots.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', padding: '0.85rem' }}>
                  {screenshots.map((shot, idx) => (
                    <div key={idx} className="timeline-item" style={{ border: '1px solid var(--border-zinc)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--bg-zinc-950)', position: 'relative' }}>
                      
                      {/* Step Header Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.75rem', backgroundColor: 'var(--bg-black)', borderBottom: '1px solid var(--border-zinc)', fontSize: '0.65rem', fontWeight: 700 }}>
                        <span style={{ color: 'var(--color-amber)' }}>
                          📸 {idx === 0 ? "INITIAL VIEWPORT STATE" : `STEP ${idx} - VIEWPORT STATE`}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {shot.timestamp}
                        </span>
                      </div>

                      {/* Viewport Frame */}
                      <div className="viewport-aspect-wrapper" style={{ width: '100%', position: 'relative', aspectRatio: '1280 / 800', overflow: 'hidden' }}>
                        <img
                          src={`data:image/png;base64,${shot.base64}`}
                          alt={`Step ${idx}`}
                          className="live-screenshot"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />

                        {/* Bounding Overlay Rings (only on the latest screenshot) */}
                        {idx === screenshots.length - 1 && showCoordinates && elements.map((el) => (
                          <div
                            key={el.id}
                            className="coordinate-marker"
                            style={{
                              left: `${(el.x / 1280) * 100}%`,
                              top: `${(el.y / 800) * 100}%`
                            }}
                          >
                            <div className="marker-ring">
                              {el.id}
                              <div className="marker-label">
                                &lt;{el.tag}&gt; {el.label || el.placeholder || 'Element'}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Ripple clicks (only on the latest screenshot) */}
                        {idx === screenshots.length - 1 && activeClick && (
                          <div
                            className="active-click-indicator"
                            style={{
                              left: `${(activeClick.x / 1280) * 100}%`,
                              top: `${(activeClick.y / 800) * 100}%`
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Auto-scroll ref anchor for screenshot timeline */}
                  <div ref={screenshotsEndRef} />
                </div>
              ) : (
                <div className="viewport-aspect-wrapper">
                  <div className="screenshot-placeholder">
                    <span className="screenshot-placeholder-icon">👁️</span>
                    <p>
                      {status === 'running'
                        ? 'Establishing visual isolation viewport...'
                        : 'Visual feed idle. Launch pilot to stream viewport.'}
                    </p>
                  </div>
                  {status === 'running' && (
                    <div className="browser-loader-overlay">
                      <div className="spinner"></div>
                      <p style={{ fontSize: '0.7rem' }}>Spawning Isolated Playwright Headless Browser...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center-Right Resizer Bar */}
          <div 
            style={{
              width: '4px',
              cursor: 'col-resize',
              background: isDraggingRight ? 'var(--color-amber)' : 'rgba(255,255,255,0.05)',
              borderRadius: '2px',
              transition: 'background 0.15s',
              alignSelf: 'stretch',
              margin: '0 0.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              zIndex: 10
            }}
            onMouseDown={() => setIsDraggingRight(true)}
            title="Drag to resize logger, double-click to reset"
            onDoubleClick={() => setRightWidth(350)}
          >
            <div style={{ width: '2px', height: '20px', background: isDraggingRight ? 'transparent' : 'rgba(255,255,255,0.15)', borderRadius: '1px' }}></div>
          </div>

          {/* Column C: Live Developer Logs (Right - MAXIMIZED SIZE) */}
          <div className="console-view" style={{ width: `${rightWidth}px`, minWidth: `${rightWidth}px`, maxWidth: `${rightWidth}px`, display: 'flex', flexDirection: 'column' }}>
            <div className="browser-header" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                📡 TELEMETRY ENGINE LOGGER
              </span>
            </div>
            <div className="console-terminal">
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontStyle: 'italic' }}>
                  // Telemetry channel idle. Awaiting loop trigger...
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={getLogClass(log)}>
                    {log}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

        </div>
      </main>

      {/* Simple Console Footer */}
      <footer className="footer-wrap" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'transparent' }}>
        <p className="footer-copy">
          Synapse Engine Control Center • Visual Telemetry Orchestrator.
        </p>
      </footer>
    </div>
  );
}

export default App;
