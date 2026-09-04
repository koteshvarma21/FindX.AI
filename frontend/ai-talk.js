/* ============================================================
   FindX.AI — AI item description assistant (ai-talk.html)

   Drives the chat UI and wires it to the real backend:
     POST /api/images/generate  -> turns a text description into
                                    an AI-generated image
     POST /api/images/confirm   -> saves the description + image
                                    once the user says it's close enough

   Notes on scope:
   - There is currently no image-analysis (vision) endpoint on the
     backend, so an uploaded photo can't be auto-described. If the
     user arrived via "Upload photo" on the search page, we say so
     up front and fall back to describing the item in words — the
     same flow as "Describe item".
   - Step 3 ("Last seen & location") doesn't have a page yet, so
     "Continue" hands off via sessionStorage and links to
     last-seen.html as a placeholder. That's the next page to build.
   ============================================================ */

const API_BASE = window.FINDX_API_BASE || 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
  const chatThread = document.getElementById('chat-thread');
  const chipRow = document.getElementById('chip-row');
  const vizCard = document.getElementById('viz-card');
  const vizSummary = document.getElementById('viz-summary');
  const matchRow = document.getElementById('match-row');
  const continueRow = document.getElementById('continue-row');
  const continueBtn = document.getElementById('continue-btn');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  // Insert an <img> into the viz-card for the generated image (markup only
  // has the placeholder icon/heading/summary — no <img> yet).
  const vizImage = document.createElement('img');
  vizImage.alt = 'AI-generated representation of your item';
  vizImage.style.cssText = 'max-width:100%;border-radius:8px;margin:14px 0;display:none;';
  vizCard.insertBefore(vizImage, vizSummary);

  const state = {
    itemName: sessionStorage.getItem('findx-item-name') || '',
    description: sessionStorage.getItem('findx-item-description') || '',
    mode: sessionStorage.getItem('findx-search-mode') || '',
    color: '',
    brand: '',
    details: '',
    imageUrl: '',
    improvements: [],
  };

  let answerHandler = null; // (text) => void — set by askQuestion()

  /* ---------------- chat primitives ---------------- */

  function addMessage(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `msg msg-${sender}`;
    bubble.textContent = text;
    chatThread.appendChild(bubble);
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  function hideChips() {
    chipRow.innerHTML = '';
    chipRow.style.display = 'none';
  }

  function showChips(options) {
    chipRow.innerHTML = '';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = opt;
      btn.addEventListener('click', () => submitAnswer(opt));
      chipRow.appendChild(btn);
    });
    chipRow.style.display = 'flex';
  }

  function submitAnswer(text) {
    if (!text || !answerHandler) return;
    addMessage(text, 'user');
    hideChips();
    chatInput.value = '';
    const handler = answerHandler;
    answerHandler = null;
    handler(text);
  }

  function askQuestion({ prompt, chips, placeholder, onAnswer }) {
    addMessage(prompt, 'ai');
    if (chips && chips.length) showChips(chips);
    if (placeholder) chatInput.placeholder = placeholder;
    answerHandler = onAnswer;
  }

  chatSend.addEventListener('click', () => submitAnswer(chatInput.value.trim()));
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAnswer(chatInput.value.trim());
  });

  /* ---------------- backend calls ---------------- */

  function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function generateImage(description, improvements) {
    const res = await fetch(`${API_BASE}/images/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ description, improvements }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Image generation failed');
    return body; // { imageUrl, promptUsed }
  }

  async function confirmImage(payload) {
    const res = await fetch(`${API_BASE}/images/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Failed to save confirmation');
    return body;
  }

  /* ---------------- conversation flow ---------------- */

  function buildDescription() {
    const parts = [state.itemName || 'an item'];
    if (state.color) parts.push(`${state.color} in color`);
    if (state.brand) parts.push(`brand/make: ${state.brand}`);
    const base = parts.join(', ');
    return [state.description, base, state.details].filter(Boolean).join('. ');
  }

  async function runGeneration() {
    matchRow.style.display = 'none';
    continueRow.style.display = 'none';
    addMessage("Give me a second — picturing that now…", 'ai');
    try {
      const { imageUrl } = await generateImage(buildDescription(), state.improvements);
      state.imageUrl = imageUrl;
      vizImage.src = imageUrl;
      vizImage.style.display = 'block';
      vizSummary.textContent = buildDescription();
      vizCard.style.display = 'block';
      addMessage('How close is this to your item?', 'ai');
      matchRow.style.display = 'flex';
    } catch (err) {
      addMessage(
        `Sorry, I couldn't generate an image (${err.message}). Make sure the backend is running and OPENAI_API_KEY is set, then try again.`,
        'ai'
      );
    }
  }

  matchRow.querySelectorAll('.match-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      matchRow.querySelectorAll('.match-btn').forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');

      const accuracyMap = { 'not-close': 25, somewhat: 60, 'very-close': 90 };
      const accuracy = accuracyMap[btn.dataset.match] ?? 50;

      if (accuracy >= 60) {
        try {
          await confirmImage({
            description: buildDescription(),
            improvements: state.improvements,
            imageUrl: state.imageUrl,
            accuracy,
          });
          addMessage("Great, I've saved that. Ready to move on?", 'ai');
          continueRow.style.display = 'flex';
        } catch (err) {
          addMessage(`Couldn't save that (${err.message}). You can still continue.`, 'ai');
          continueRow.style.display = 'flex';
        }
      } else {
        matchRow.style.display = 'none';
        askQuestion({
          prompt: "No worries — what should I change? (e.g. color, size, a logo I got wrong)",
          placeholder: 'Type a correction…',
          onAnswer: (text) => {
            state.improvements.push(text);
            runGeneration();
          },
        });
      }
    });
  });

  continueBtn.addEventListener('click', () => {
    sessionStorage.setItem('findx-final-description', buildDescription());
    sessionStorage.setItem('findx-final-image', state.imageUrl);
    // Step 3 (last seen & location) isn't built yet — this is the next page to add.
    window.location.href = 'last-seen.html';
  });

  /* ---------------- kick off the conversation ---------------- */

  function start() {
    if (state.mode === 'upload') {
      addMessage(
        "Thanks for the photo! I can't scan images just yet, so let's describe it together in a few words instead.",
        'ai'
      );
      askItemName();
    } else if (state.mode === 'describe' && state.itemName) {
      addMessage(`Got it — you lost a ${state.itemName}.`, 'ai');
      if (state.description) addMessage(`You told us: "${state.description}"`, 'ai');
      askColor();
    } else {
      addMessage("Hi! Let's build a picture of what you lost. What's the item called?", 'ai');
      askItemName();
    }
  }

  function askItemName() {
    askQuestion({
      prompt: state.mode === 'upload' ? "What's the item called?" : "What's the item called?",
      placeholder: 'e.g. backpack, water bottle…',
      onAnswer: (text) => {
        state.itemName = text;
        askDetails();
      },
    });
  }

  function askDetails() {
    askQuestion({
      prompt: 'Any distinguishing details — brand, marks, condition?',
      placeholder: 'Type details, or "skip"',
      onAnswer: (text) => {
        if (text.toLowerCase() !== 'skip') state.details = text;
        askColor();
      },
    });
  }

  function askColor() {
    askQuestion({
      prompt: 'What color is it, mostly?',
      chips: ['Black', 'White', 'Blue', 'Red', 'Green', 'Other'],
      placeholder: 'Or type a color…',
      onAnswer: (text) => {
        state.color = text;
        askBrand();
      },
    });
  }

  function askBrand() {
    askQuestion({
      prompt: 'Any brand or make? (Skip if not sure)',
      chips: ['Not sure / skip'],
      placeholder: 'Type a brand…',
      onAnswer: (text) => {
        if (!/skip|not sure/i.test(text)) state.brand = text;
        runGeneration();
      },
    });
  }

  start();
});
