const localtunnel = require("localtunnel");

const SUBDOMAIN = process.env.LT_SUBDOMAIN || "salonmobilemendi";
const CONNECT_TIMEOUT_MS = 20000;

(async () => {
  console.log(`Starting tunnel on port 5000 (subdomain: ${SUBDOMAIN})...`);
  try {
    const tunnel = await Promise.race([
      localtunnel({ port: 5000, subdomain: SUBDOMAIN }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timed out while creating tunnel")), CONNECT_TIMEOUT_MS)
      )
    ]);

    console.log("TUNNEL_URL=" + tunnel.url);
    console.log("Keep this terminal open while using Expo Go.");
    tunnel.on("close", () => console.log("Tunnel closed"));
  } catch (e) {
    console.error("Tunnel error:", e.message || e);
    console.error("Try a different subdomain:");
    console.error("  set LT_SUBDOMAIN=myuniquename && node start-tunnel.js");
    process.exit(1);
  }
})();
