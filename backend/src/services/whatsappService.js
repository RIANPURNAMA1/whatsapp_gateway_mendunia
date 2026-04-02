const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  isJidBroadcast,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");
const qrcode = require("qrcode");
const WaSession = require("../models/WaSession");
const { AutoReply, MessageLog } = require("../models/MessageTemplate");

const SESSIONS_DIR = path.resolve(process.env.SESSIONS_DIR || "./sessions");
const activeSessions = new Map();

function getLogger() {
  return pino({ level: "silent" });
}


async function createSession(sessionId, userId, io) {
  const sessionDir = path.join(SESSIONS_DIR, `session_${sessionId}`);

  // Pastikan folder sesi ada dengan permission yang benar di VPS
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true, mode: 0o777 });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  // Bersihkan socket lama jika ada (mencegah memory leak / port hang)
  const oldSock = activeSessions.get(sessionId);
  if (oldSock) {
    try {
      oldSock.ws.close();
    } catch (e) {}
    activeSessions.delete(sessionId);
  }

  const sock = makeWASocket({
    version,
    logger: getLogger(),
    printQRInTerminal: false, // Jangan print di terminal VPS agar log bersih
    auth: state,
    // Gunakan user-agent yang stabil untuk Linux/VPS
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
  });

  activeSessions.set(sessionId, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // 1. Handling QR Code
    if (qr) {
      try {
        const qrBase64 = await qrcode.toDataURL(qr);
        // Update database hanya sekali-kali agar tidak overload
        await WaSession.update(
          { qr_code: qrBase64, status: "connecting" },
          { where: { id: sessionId } },
        );
        // Kirim ke frontend via Socket.io
        io.to(`user_${userId}`).emit("qr_code", { sessionId, qr: qrBase64 });
        console.log(`[Session ${sessionId}] QR Code generated`);
      } catch (e) {
        console.error("QR generation error:", e);
      }
    }

    // 2. Handling Connection Closed
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[Session ${sessionId}] Connection closed. Reason:`,
        statusCode,
      );

      await WaSession.update(
        { status: "disconnected", qr_code: null },
        { where: { id: sessionId } },
      );

      io.to(`user_${userId}`).emit("session_status", {
        sessionId,
        status: "disconnected",
      });
      activeSessions.delete(sessionId);

      if (shouldReconnect) {
        console.log(`[Session ${sessionId}] Reconnecting in 5s...`);
        setTimeout(() => createSession(sessionId, userId, io), 5000);
      } else {
        console.log(`[Session ${sessionId}] Logged out. Cleaning files...`);
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
      }
    }

    // 3. Handling Connection Open
    if (connection === "open") {
      const phoneNumber = sock.user?.id?.split(":")[0] || sock.user?.id;
      await WaSession.update(
        {
          status: "connected",
          qr_code: null,
          phone_number: phoneNumber,
          last_connected: new Date(),
        },
        { where: { id: sessionId } },
      );

      io.to(`user_${userId}`).emit("session_status", {
        sessionId,
        status: "connected",
        phoneNumber,
      });
      console.log(`[Session ${sessionId}] Connected as ${phoneNumber}`);
    }
  });

  // --- Handling Messages ---
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (isJidBroadcast(msg.key.remoteJid) || msg.key.fromMe) continue;

      const fromJid = msg.key.remoteJid;
      const fromNumber = fromJid.split("@")[0];
      const senderName = msg.pushName || fromNumber;

      const content =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";

      // Simpan log pesan masuk ke DB secara async
      MessageLog.create({
        session_id: sessionId,
        direction: "incoming",
        from_number: fromNumber,
        from_name: senderName,
        to_number: sock.user?.id?.split(":")[0] || "",
        message_type: "text",
        content: content,
        message_id: msg.key.id,
      }).catch((err) => console.error("Log DB Error:", err.message));

      // Auto Reply Logic
      handleAutoReply(sessionId, fromNumber, content, sock);

      // Emit ke UI dashboard
      io.to(`user_${userId}`).emit("incoming_message", {
        sessionId,
        from: fromNumber,
        from_name: senderName,
        content,
        timestamp: new Date(),
      });
    }
  });

  return sock;
}

// Fungsi helper Auto Reply agar kode createSession tidak terlalu panjang
async function handleAutoReply(sessionId, fromNumber, content, sock) {
  try {
    const autoReplies = await AutoReply.findAll({
      where: { session_id: sessionId, is_active: 1 },
    });

    for (const rule of autoReplies) {
      let matched = false;
      const keyword = rule.trigger_keyword.toLowerCase();
      const msgLower = content.toLowerCase();

      if (rule.match_type === "exact") matched = msgLower === keyword;
      else if (rule.match_type === "contains")
        matched = msgLower.includes(keyword);

      if (matched) {
        await sock.sendMessage(`${fromNumber}@s.whatsapp.net`, {
          text: rule.reply_message,
        });
        await rule.increment("reply_count");
        break;
      }
    }
  } catch (e) {
    console.error("Auto reply error:", e);
  }
}

// Fungsi Send Message
async function sendMessage(sessionId, to, text, options = {}) {
  const sock = activeSessions.get(sessionId);
  if (!sock) throw new Error(`Session ${sessionId} not connected`);

  const jid = to.includes("@s.whatsapp.net") ? to : `${to}@s.whatsapp.net`;
  
  const messageOptions = {
    text,
    ...options,
  };

  const result = await sock.sendMessage(jid, messageOptions);
  return result;
}

// Export fungsi lainnya tetap sama
module.exports = {
  createSession,
  restoreActiveSessions: async (io) => {
    const sessions = await WaSession.findAll({
      where: { status: "connected" },
    });
    for (const s of sessions) createSession(s.id, s.user_id, io);
  },
  activeSessions,
  sendMessage,
};
