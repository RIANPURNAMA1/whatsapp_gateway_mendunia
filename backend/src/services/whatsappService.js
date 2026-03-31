const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeInMemoryStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const WaSession = require('../models/WaSession');
const { AutoReply, MessageLog } = require('../models/MessageTemplate');

const SESSIONS_DIR = path.resolve(process.env.SESSIONS_DIR || './sessions');
const activeSessions = new Map(); // sessionId -> socket

function getLogger() {
  return pino({ level: 'silent' });
}

async function createSession(sessionId, userId, io) {
  const sessionDir = path.join(SESSIONS_DIR, `session_${sessionId}`);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: getLogger(),
    printQRInTerminal: false,
    auth: state,
    browser: ['WA Blast Pro', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  activeSessions.set(sessionId, sock);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrBase64 = await qrcode.toDataURL(qr);
        await WaSession.update({ qr_code: qrBase64, status: 'connecting' }, { where: { id: sessionId } });
        io.to(`user_${userId}`).emit('qr_code', { sessionId, qr: qrBase64 });
      } catch (e) {
        console.error('QR generation error:', e);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      await WaSession.update(
        { status: 'disconnected', qr_code: null },
        { where: { id: sessionId } }
      );
      io.to(`user_${userId}`).emit('session_status', {
        sessionId,
        status: 'disconnected',
      });

      activeSessions.delete(sessionId);

      if (shouldReconnect) {
        console.log(`Reconnecting session ${sessionId}...`);
        setTimeout(() => createSession(sessionId, userId, io), 5000);
      } else {
        console.log(`Session ${sessionId} logged out.`);
        const sessionDir2 = path.join(SESSIONS_DIR, `session_${sessionId}`);
        if (fs.existsSync(sessionDir2)) {
          fs.rmSync(sessionDir2, { recursive: true });
        }
      }
    }

    if (connection === 'open') {
      const phoneNumber = sock.user?.id?.split(':')[0] || sock.user?.id;
      await WaSession.update(
        { status: 'connected', qr_code: null, phone_number: phoneNumber, last_connected: new Date() },
        { where: { id: sessionId } }
      );
      io.to(`user_${userId}`).emit('session_status', {
        sessionId,
        status: 'connected',
        phoneNumber,
      });
      console.log(`Session ${sessionId} connected as ${phoneNumber}`);
    }
  });

sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return;
  
  for (const msg of messages) {
    if (isJidBroadcast(msg.key.remoteJid)) continue;
    if (msg.key.fromMe) continue;

    const fromJid = msg.key.remoteJid;
    const fromNumber = fromJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    // --- PERBAIKAN: Tangkap Nama WhatsApp ---
    // msg.pushName berisi nama profil WA pengirim
    const senderName = msg.pushName || fromNumber; 
    
    const content = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || 
                    msg.message?.imageMessage?.caption || 
                    msg.message?.videoMessage?.caption || '';

    // Log incoming message ke Database
    try {
      const session = await WaSession.findByPk(sessionId);
      if (session) {
        await MessageLog.create({
          session_id: sessionId,
          direction: 'incoming',
          from_number: fromNumber,
          from_name: senderName, // DISIMPAN DISINI
          to_number: session.phone_number || '',
          message_type: 'text',
          content: content,
          message_id: msg.key.id,
        });
      }
    } catch (e) { 
      console.error('Gagal simpan log ke DB:', e.message);
    }

    // Auto Reply Logic
    try {
      const autoReplies = await AutoReply.findAll({
        where: { session_id: sessionId, is_active: 1 },
      });

      for (const rule of autoReplies) {
        let matched = false;
        const keyword = rule.trigger_keyword.toLowerCase();
        const msgLower = content.toLowerCase();

        if (rule.match_type === 'exact') matched = msgLower === keyword;
        else if (rule.match_type === 'contains') matched = msgLower.includes(keyword);
        else if (rule.match_type === 'starts_with') matched = msgLower.startsWith(keyword);
        else if (rule.match_type === 'regex') {
          try { matched = new RegExp(rule.trigger_keyword, 'i').test(content); } catch (e) {}
        }

        if (matched) {
          await sendMessage(sessionId, fromNumber, rule.reply_message);
          await rule.increment('reply_count');
          break;
        }
      }
    } catch (e) {
      console.error('Auto reply error:', e);
    }

    // --- PERBAIKAN: Kirim Nama ke Frontend via Socket ---
    io.to(`user_${userId}`).emit('incoming_message', {
      sessionId,
      from: fromNumber,
      from_name: senderName, // DIKIRIM KE FRONTEND
      content,
      timestamp: new Date(),
    });
  }
});

  return sock;
}

async function sendMessage(sessionId, phone, message, mediaOptions = null) {
  const sock = activeSessions.get(sessionId);
  if (!sock) throw new Error('Session not connected');

  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

  if (mediaOptions && mediaOptions.type !== 'none') {
    const { type, buffer, filename, mimetype, caption } = mediaOptions;
    if (type === 'image') {
      return await sock.sendMessage(jid, { image: buffer, caption: caption || message, mimetype: mimetype || 'image/jpeg' });
    } else if (type === 'video') {
      return await sock.sendMessage(jid, { video: buffer, caption: caption || message, mimetype: mimetype || 'video/mp4' });
    } else if (type === 'document') {
      return await sock.sendMessage(jid, { document: buffer, fileName: filename || 'file', mimetype: mimetype || 'application/octet-stream', caption: caption || message });
    }
  }

  return await sock.sendMessage(jid, { text: message });
}

async function isSessionConnected(sessionId) {
  const sock = activeSessions.get(sessionId);
  return sock && sock.user ? true : false;
}

async function disconnectSession(sessionId) {
  const sock = activeSessions.get(sessionId);
  if (sock) {
    await sock.logout();
    activeSessions.delete(sessionId);
  }
  const sessionDir = path.join(SESSIONS_DIR, `session_${sessionId}`);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true });
  }
}

async function restoreActiveSessions(io) {
  try {
    const sessions = await WaSession.findAll({ where: { status: 'connected' } });
    for (const session of sessions) {
      const sessionDir = path.join(SESSIONS_DIR, `session_${session.id}`);
      if (fs.existsSync(sessionDir)) {
        console.log(`Restoring session ${session.id} (${session.session_name})`);
        await createSession(session.id, session.user_id, io);
      } else {
        await session.update({ status: 'disconnected' });
      }
    }
  } catch (e) {
    console.error('Error restoring sessions:', e);
  }
}

module.exports = {
  createSession,
  sendMessage,
  isSessionConnected,
  disconnectSession,
  restoreActiveSessions,
  activeSessions,
};
