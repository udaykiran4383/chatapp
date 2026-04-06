import https from "node:https";
setInterval(() => { https.get("https://chatapp-backend-qomq.onrender.com/api/auth/check", (res) => { console.log("Health check ping:", res.statusCode); }).on("error", (e) => { console.error("Health check ping error:", e.message); }); }, 14 * 60 * 1000);
