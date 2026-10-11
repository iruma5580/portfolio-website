'use strict';
const router = require('express').Router();
const https = require('https');
let windowStart = Date.now(), count = 0;
router.post('/', (req, res) => {
  const { chatInput, sessionId } = req.body || {};
  if (typeof chatInput !== 'string' || !chatInput.trim() || chatInput.length > 2000 || typeof sessionId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(sessionId)) return res.status(400).json({ error: 'Please enter a message of up to 2,000 characters.' });
  let url;
  try {
    url = new URL(process.env.N8N_CHAT_WEBHOOK_URL);
    if (url.protocol !== 'https:' || url.username || url.password) throw Error();
  } catch (_) { return res.status(503).json({ error: 'Chat is not connected yet. Please use the contact section.' }); }
  if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); count = 0; }
  if (++count > 30) return res.status(429).set('Retry-After', '60').json({ error: 'Chat is busy. Please try again in a minute.' });
  const body = JSON.stringify({ action: 'sendMessage', chatInput: chatInput.trim(), sessionId });
  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
  if (process.env.N8N_CHAT_WEBHOOK_TOKEN) headers['X-Chat-Token'] = process.env.N8N_CHAT_WEBHOOK_TOKEN;
  const upstream = https.request(url, { method: 'POST', headers }, response => {
    let raw = '';
    response.setEncoding('utf8');
    response.on('data', chunk => { raw += chunk; if (raw.length > 100000) upstream.destroy(Error('Too large')); });
    response.on('error', () => upstream.destroy(Error('Interrupted')));
    response.on('end', () => {
      clearTimeout(timer);
      if (res.destroyed || res.writableEnded) return;
      try {
        if (response.statusCode < 200 || response.statusCode >= 300) throw Error();
        let data = JSON.parse(raw);
        if (Array.isArray(data)) data = data[0];
        const reply = data && (data.output || data.text || data.reply);
        if (typeof reply !== 'string' || !reply.trim()) throw Error();
        res.json({ reply });
      } catch (_) { res.status(502).json({ error: 'The assistant could not reply. Please try again.' }); }
    });
  });
  const timer = setTimeout(() => upstream.destroy(Error('Timeout')), 45000);
  upstream.on('error', () => {
    clearTimeout(timer);
    if (!res.destroyed && !res.writableEnded) res.status(502).json({ error: 'The assistant is unavailable. Please try again shortly.' });
  });
  res.on('close', () => { clearTimeout(timer); upstream.destroy(); });
  upstream.end(body);
});
module.exports = router;
