export default async function healthRoutes(fastify, options) {
  const apiEndpoints = {
    Public_Booking_and_Tracking: [
      {
        method: "POST",
        path: "/api/bookings",
        description: "Submit repair request.",
      },
      {
        method: "GET",
        path: "/api/bookings/:id",
        description: "Retrieve status & details.",
      },
    ],
    Admin_Management: [
      {
        method: "GET",
        path: "/api/admin/bookings",
        description: "Retrieve active/search results.",
      },
      {
        method: "PATCH",
        path: "/api/admin/bookings/:id/status",
        description: "Update booking status.",
      },
      {
        method: "POST",
        path: "/api/admin/bookings/:id/archive",
        description: "Archive completed job.",
      },
      {
        method: "GET",
        path: "/api/admin/archived-bookings",
        description: "Retrieve archived history.",
      },
    ],
  };

  fastify.get("/", async (request, reply) => {
    let dbStatus = { status: "disconnected", dbTime: null, error: null };
    let cpuLoadFactor = Math.floor(Math.random() * 20 + 70);
    let memoryLoadFactor = Math.floor(Math.random() * 30 + 30); // 30-60% simulated memory load
    let latencyMs = Math.floor(Math.random() * 10 + 5); // 5-15ms simulated latency

    try {
      // Test the DB connection
      const result = await fastify.pg?.query("SELECT NOW()");
      dbStatus = {
        status: "connected",
        dbTime: result.rows[0].now,
        error: null,
      };
      cpuLoadFactor = Math.floor(Math.random() * 10 + 5);
      memoryLoadFactor = Math.floor(Math.random() * 10 + 20); // Lower memory load when stable
    } catch (err) {
      dbStatus.error = err.error ? err.error.message : err.message;
    }

    // Format the API list nicely
    const formattedEndpoints = Object.entries(apiEndpoints).map(
      ([group, endpoints]) => ({
        group: group.replace(/_/g, " "),
        endpoints: endpoints.map((e) => ({
          method: e.method,
          path: e.path,
          description: e.description,
        })),
      })
    );

    // Generate Dynamic Log Messages
    const logMessages = [
      {
        time: "08:00:01",
        level: "INIT",
        msg: "System Core services initialized.",
      },
      {
        time: "08:00:03",
        level: "INFO",
        msg: "Gateway security protocols engaged.",
      },
      {
        time: "08:00:05",
        level: dbStatus.status === "connected" ? "SUCCESS" : "ERROR",
        msg:
          dbStatus.status === "connected"
            ? `DB Connection established. Ping: ${latencyMs}ms.`
            : `DB Connection Failed: ${dbStatus.error.substring(0, 50)}...`,
      },
      {
        time: "08:00:06",
        level: "TASK",
        msg: `Current CPU Load: ${cpuLoadFactor}%. Memory: ${memoryLoadFactor}%.`,
      },
      {
        time: "08:00:08",
        level: "TASK",
        msg: "Verification complete. Awaiting API requests.",
      },
    ];

    // Build the endpoints list HTML
    const endpointsHtml = formattedEndpoints
      .map(
        (group) => `
      <div class="mb-6 border border-blue-900/40 p-4 rounded-lg bg-gray-900/40 terminal-section">
        <h3 class="text-lg font-bold text-cyan-300 mb-3 border-b border-cyan-700/50 pb-1">${
          group.group
        }</h3>
        <div class="space-y-3">
          ${group.endpoints
            .map((e) => {
              let textColor = "text-gray-400";
              let borderColor = "border-gray-700";

              switch (e.method) {
                case "GET":
                  textColor = "text-lime-300";
                  borderColor = "border-lime-700";
                  break;
                case "POST":
                  textColor = "text-yellow-400";
                  borderColor = "border-yellow-700";
                  break;
                case "PATCH":
                  textColor = "text-orange-400";
                  borderColor = "border-orange-700";
                  break;
                case "DELETE":
                  textColor = "text-red-400";
                  borderColor = "border-red-700";
                  break;
                default:
                  textColor = "text-purple-400";
                  borderColor = "border-purple-700";
              }

              return `
              <div class="bg-gray-800/30 p-2 rounded-md border border-gray-700/30 hover:bg-gray-800 transition duration-300">
                <span class="font-mono text-xs ${textColor} mr-3 py-0.5 px-1 rounded-sm border ${borderColor} font-bold">${e.method}</span>
                <code class="text-sm text-white">${e.path}</code>
                <p class="text-xs text-slate-400 mt-1">${e.description}</p>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `
      )
      .join("");

    // Build Log HTML
    const logHtml = logMessages
      .map((log) => {
        let color = "text-cyan-400";
        if (log.level === "ERROR") color = "text-red-500";
        if (log.level === "SUCCESS") color = "text-lime-400";

        return `
            <div class="flex space-x-4 text-xs terminal-log">
                <span class="text-slate-500">${log.time}</span>
                <span class="font-bold ${color}">[${log.level}]</span>
                <span class="flex-1 text-slate-300">${log.msg}</span>
            </div>
        `;
      })
      .join("");

    // --- Final HTML Output ---

    // Determine status color and icon
    const dbConnected = dbStatus.status === "connected";
    const statusColor = dbConnected ? "text-lime-400" : "text-red-500";
    const statusBg = dbConnected ? "bg-lime-700/20" : "bg-red-700/20";
    const statusText = dbConnected ? "OPERATIONAL" : "FAILURE";
    const statusIcon = dbConnected ? "✅" : "🚨";
    const dbGlow = dbConnected ? "shadow-lime-500/50" : "shadow-red-500/50";

    // Set the content type to HTML
    reply.type("text/html");

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>API Status - Quantum Diagnostics</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
              @keyframes pulse-glow {
                  0% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.02); opacity: 0.9; }
                  100% { transform: scale(1); opacity: 1; }
              }
              body {
                  font-family: 'Rajdhani', sans-serif; /* Readable, clean font for data */
                  background: #000;
                  color: #00e0ff; /* Neon Cyan base */
                  min-height: 100vh;
                  background-image: radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.05) 1px, transparent 1px);
                  background-size: 50px 50px;
              }
              .screen-container {
                  background: #03060f;
                  border: 2px solid #00e0ff1a;
                  box-shadow: 0 0 100px rgba(0, 150, 255, 0.6);
                  border-radius: 0.75rem;
                  overflow: hidden;
              }
              .glow-text {
                  text-shadow: 0 0 15px rgba(0, 255, 255, 1);
              }
              .status-box-glow {
                  box-shadow: 0 0 20px 5px var(--tw-shadow-color);
                  animation: pulse-glow 3s infinite;
              }
              .terminal-section {
                  background: rgba(13, 17, 23, 0.6);
                  border-color: #24292e;
                  border-left: 5px solid #00e0ff;
              }
              .time-display {
                letter-spacing: 3px;
                font-weight: 700;
                color: #ffaa00;
                font-family: monospace;
              }
              .header-title {
                  font-family: 'Russo One', sans-serif; /* Aggressive, blocky font for titles */
              }
              .load-bar-wrapper {
                  height: 10px;
                  border: 1px solid #00e0ff;
                  border-radius: 2px;
                  overflow: hidden;
                  position: relative;
              }
              .load-bar {
                  transition: width 0.5s;
                  height: 100%;
                  background: linear-gradient(90deg, #10b981, #00e0ff);
              }
              .terminal-log {
                  font-family: monospace;
              }
              /* Responsive adjustments */
              @media (max-width: 640px) {
                  .terminal-text { font-size: 0.7rem; }
                  .text-xs { font-size: 0.6rem; }
                  .text-3xl { font-size: 1.5rem; }
              }
          </style>
          <!-- Load new futuristic fonts (Russo One for Titles, Rajdhani for body) -->
          <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600&family=Russo+One&display=swap" rel="stylesheet">
      </head>
      <body class="p-4 sm:p-8">
          <div class="max-w-4xl mx-auto space-y-8 screen-container p-6 sm:p-10">
              
              <header class="text-center pb-4 border-b border-cyan-900/50">
                  <h1 class="text-3xl font-extrabold text-white glow-text tracking-widest mb-1 sm:text-4xl header-title">
                      INF. TECH repair
                  </h1>
                  <p class="text-sm text-cyan-400 terminal-text">
                      [QUANTUM DIAGNOSTICS LOG] ERA 5025 GATEWAY
                  </p>
              </header>

              <!-- SYSTEM STATUS BLOCK -->
              <div class="p-6 rounded-lg border border-cyan-600/50 shadow-lg ${dbGlow} status-box-glow">
                  <div class="flex items-center justify-between flex-wrap gap-4">
                      <div class="flex items-center gap-3">
                          <span class="text-4xl">${statusIcon}</span>
                          <div>
                              <p class="text-2xl font-bold ${statusColor} terminal-text">${statusText}</p>
                              <p class="text-xs text-slate-400">NETWORK/SERVICE AVAILABILITY</p>
                          </div>
                      </div>
                      
                      <div class="text-right">
                          <p class="text-xs text-slate-400 terminal-text">HYPERTIME STAMP (GALACTIC)</p>
                          <p id="live-time" class="text-lg font-semibold text-white time-display"></p>
                      </div>
                  </div>
              </div>

              <!-- RESOURCE MONITOR & DB CORE -->
              <!-- FIXED: Changed to grid-cols-1 on mobile, grid-cols-2 on desktop -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <!-- RESOURCE MONITOR -->
                  <div class="p-6 rounded-lg border border-gray-700/50 bg-gray-900/50">
                      <h2 class="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
                          <span class="text-cyan-400">[RESOURCE]</span> LOAD MONITOR
                      </h2>
                      <div class="space-y-4">
                          <!-- CPU LOAD -->
                          <div class="space-y-2">
                              <div class="flex justify-between text-xs text-slate-400">
                                  <span>SYSTEM_CORE_USAGE</span>
                                  <span id="cpu-load-value">${cpuLoadFactor}%</span>
                              </div>
                              <div class="load-bar-wrapper">
                                  <div id="cpu-load-bar" class="load-bar" style="width: ${cpuLoadFactor}%;"></div>
                              </div>
                          </div>
                          
                          <!-- MEMORY LOAD -->
                          <div class="space-y-2">
                              <div class="flex justify-between text-xs text-slate-400">
                                  <span>MEMORY_ALLOCATION</span>
                                  <span id="mem-load-value">${memoryLoadFactor}%</span>
                              </div>
                              <div class="load-bar-wrapper">
                                  <div id="mem-load-bar" class="load-bar" style="width: ${memoryLoadFactor}%;"></div>
                              </div>
                          </div>
                          
                          <!-- LATENCY -->
                          <div class="flex justify-between text-xs text-slate-400 pt-2 border-t border-gray-700/50">
                              <span>NETWORK_LATENCY (GATEWAY PING)</span>
                              <span id="latency-value" class="text-amber-400 font-semibold terminal-text">${latencyMs} MS</span>
                          </div>
                      </div>
                  </div>

                  <!-- DB CORE -->
                  <div class="p-6 rounded-lg border border-gray-700/50 bg-gray-900/50">
                      <h2 class="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
                          <span class="text-cyan-400">[DB CORE]</span> STATUS
                      </h2>
                      <div class="space-y-3 terminal-text">
                          <div class="flex justify-between items-center">
                              <span class="text-sm text-slate-400">SERVICE_TYPE</span>
                              <span class="text-sm text-yellow-300">PostgreSQL (Cloud SQL)</span>
                          </div>
                          <div class="flex justify-between items-center">
                              <span class="text-sm text-slate-400">STATUS_CODE</span>
                              <span class="font-bold py-1 px-3 rounded-md ${statusBg} ${statusColor} text-xs status-box-glow">
                                  ${dbStatus.status.toUpperCase()}
                              </span>
                          </div>
                      </div>
                      ${
                        dbStatus.error
                          ? `<div class="p-3 bg-red-800/30 text-red-300 rounded-md text-sm font-mono break-all mt-4 border border-red-600/50">ERROR_DETAIL: ${dbStatus.error}</div>`
                          : ""
                      }
                  </div>
              </div>

              <!-- SYSTEM LOGS -->
              <div class="p-6 rounded-lg border border-gray-700/50 bg-gray-900/50">
                  <h2 class="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
                      <span class="text-cyan-400">[SYSTEM]</span> DIAGNOSTICS LOG
                  </h2>
                  <div class="space-y-1 terminal-log overflow-y-auto max-h-48">
                      ${logHtml}
                  </div>
              </div>
              
              <!-- API DIRECTORY -->
              <div class="p-6 rounded-lg border border-gray-700/50 bg-gray-900/50">
                  <h2 class="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">
                      <span class="text-cyan-400">[GATEWAY]</span> ENDPOINT DIRECTORY
                  </h2>
                  ${endpointsHtml}
              </div>

              <!-- FOOTER -->
              <footer class="text-center pt-4 border-t border-cyan-900/50">
                  <p class="text-xs text-slate-600 terminal-text">INITIATED BY VERIFIED AGENT V.5000</p>
              </footer>
          </div>
          
          <script>
              function updateClock() {
                  const now = new Date();
                  
                  // Add 5000 years to current date
                  const futureYear = now.getFullYear() + 5000; 
                  
                  const day = String(now.getDate()).padStart(2, '0');
                  const month = now.toLocaleString('en-US', { month: 'short' });
                  
                  // Get time components, padding with 0s
                  const hours = String(now.getHours()).padStart(2, '0');
                  const minutes = String(now.getMinutes()).padStart(2, '0');
                  const seconds = String(now.getSeconds()).padStart(2, '0');
                  
                  // Custom format: DD MON YYYY, HH:MM:SS
                  const formattedTime = \`\${day} \${month.toUpperCase()} \${futureYear}, \${hours}:\${minutes}:\${seconds}\`;
                  
                  const targetElement = document.getElementById('live-time');
                  if (targetElement) {
                      targetElement.textContent = formattedTime;
                  }
              }

              // --- RESOURCE FLUCTUATION FUNCTION ---
              function updateResources() {
                  // Simulate realistic but random fluctuation based on current status
                  const isConnected = "${dbStatus.status}" === "connected";
                  
                  let cpuBase = isConnected ? 8 : 75;
                  let memBase = isConnected ? 20 : 40;
                  let latencyBase = 5;

                  // Apply small random variance (1-5%)
                  const cpuLoad = Math.min(100, cpuBase + Math.floor(Math.random() * 5) - 2); 
                  const memLoad = Math.min(100, memBase + Math.floor(Math.random() * 5) - 2);
                  const latency = latencyBase + Math.floor(Math.random() * 10) + 1;


                  // Update HTML elements
                  document.getElementById('cpu-load-value').textContent = \`\${cpuLoad}%\`;
                  document.getElementById('mem-load-value').textContent = \`\${memLoad}%\`;
                  document.getElementById('latency-value').textContent = \`\${latency} MS\`;
                  
                  document.getElementById('cpu-load-bar').style.width = \`\${cpuLoad}%\`;
                  document.getElementById('mem-load-bar').style.width = \`\${memLoad}%\`;

                  // Optional: Update Log (if needed, but keeping separate for now)
              }

              // Initialize and set interval for ticking
              document.addEventListener('DOMContentLoaded', () => {
                  updateClock(); 
                  updateResources(); // Initial resource display
                  setInterval(updateClock, 1000); // Time updates every second
                  setInterval(updateResources, 2000); // Resources update every 2 seconds
              });
          </script>
      </body>
      </html>
    `;
  });
}
