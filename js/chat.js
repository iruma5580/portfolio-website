(() => {
  const widget = document.createElement('aside');
  widget.className = 'portfolio-chat';
  widget.setAttribute('aria-label', 'Portfolio assistant');
  widget.innerHTML = `<section id="chat-panel" aria-labelledby="chat-title" hidden><header><div><h2 id="chat-title">Portfolio assistant</h2><p>Chat with an AI assistant</p></div><button class="chat-close" aria-label="Close chat">×</button></header><div class="chat-log" role="log" aria-live="polite" aria-label="Conversation"></div><p class="chat-status" role="status"></p><form><label for="chat-input">Your message</label><div class="chat-row"><input id="chat-input" maxlength="2000" placeholder="Ask a question…" autocomplete="off" required><button>Send</button></div><small>AI can make mistakes. Avoid sharing sensitive information.</small></form></section><button class="chat-toggle" aria-expanded="false" aria-controls="chat-panel">Let’s chat ↗</button>`;
  document.body.append(widget);
  const panel = widget.querySelector('section'), toggle = widget.querySelector('.chat-toggle'), input = widget.querySelector('input'), form = widget.querySelector('form'), send = form.querySelector('button'), status = widget.querySelector('.chat-status'), log = widget.querySelector('.chat-log');
  const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
  function message(text, role) { const p = document.createElement('p'); p.className = 'chat-message chat-' + role; p.textContent = text; log.append(p); log.scrollTop = log.scrollHeight; }
  function open(value) { panel.hidden = !value; toggle.setAttribute('aria-expanded', String(value)); (value ? input : toggle).focus(); }
  toggle.onclick = () => open(panel.hidden);
  widget.querySelector('.chat-close').onclick = () => open(false);
  widget.onkeydown = event => { if (event.key === 'Escape') open(false); };
  message('Hi! How can I help you today?', 'assistant');
  form.onsubmit = async event => {
    event.preventDefault();
    const chatInput = input.value.trim();
    if (!chatInput || send.disabled) return;
    message(chatInput, 'user'); input.value = ''; input.disabled = send.disabled = true; status.textContent = 'Thinking…';
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 50000);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatInput, sessionId }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not send your message.');
      if (typeof data.reply !== 'string') throw Error('The assistant returned an unreadable reply.');
      message(data.reply, 'assistant'); status.textContent = '';
    } catch (error) { status.textContent = error.name === 'AbortError' ? 'The reply took too long. Please try again.' : error.message; input.value = chatInput; }
    finally { clearTimeout(timer); input.disabled = send.disabled = false; if (!panel.hidden) input.focus(); }
  };
})();
