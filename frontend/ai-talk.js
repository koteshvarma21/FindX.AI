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
  const skipImageBtn = document.getElementById('skip-image-btn');
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
    conversation: [],
    extractedDetails: {
      category: '',
      color: '',
      brand: '',
      uniqueFeatures: [],
    },
  };
  try { mergeExtractedDetails(JSON.parse(sessionStorage.getItem('findx-extracted-details') || '{}')); } catch (_error) { /* ignore invalid temporary state */ }

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
    state.conversation.push({ role: 'assistant', content: prompt });
    state.conversation.push({ role: 'assistant', content: prompt });
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

  async function fetchFollowUpQuestion() {
    const payload = {
      originalDescription: buildDescription(),
      conversation: state.conversation,
    };

    try {
      const res = await fetch(`${API_BASE}/ai/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body?.question) {
        return null;
      }
      return body;
    } catch (error) {
      console.error('AI follow-up request failed:', error.message);
      return null;
    }
  }

  function mergeExtractedDetails(details = {}) {
    state.extractedDetails = {
      ...state.extractedDetails,
      ...details,
      uniqueFeatures: [...new Set([
        ...state.extractedDetails.uniqueFeatures,
        ...(Array.isArray(details.uniqueFeatures) ? details.uniqueFeatures : []),
      ])],
    };
    if (details.itemName && !state.itemName) state.itemName = details.itemName;
    if (details.category && !state.itemName) state.itemName = details.category;
    if (details.color && !state.color) state.color = details.color;
    if (details.brand && !state.brand) state.brand = details.brand;
  }

  /* ---------------- conversation flow ---------------- */

  function buildDescription() {
    const parts = [state.itemName || 'an item'];
    if (state.color) parts.push(`${state.color} in color`);
    if (state.brand) parts.push(`brand/make: ${state.brand}`);
    if (state.extractedDetails.uniqueFeatures.length) {
      parts.push(`identifying features: ${state.extractedDetails.uniqueFeatures.join(', ')}`);
    }
    const base = parts.join(', ');
    return [state.description, base, state.details].filter(Boolean).join('. ');
  }

  async function runGeneration() {
    matchRow.style.display = 'none';
    continueRow.style.display = 'flex';
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
        `I couldn't generate an optional image (${err.message}). You can still continue with your report.`,
        'ai'
      );
      vizSummary.textContent = buildDescription();
      vizCard.style.display = 'block';
      continueRow.style.display = 'flex';
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
          const confirmation = await confirmImage({
            description: buildDescription(),
            improvements: state.improvements,
            imageUrl: state.imageUrl,
            accuracy,
          });
          if (confirmation.generatedImageId) state.generatedImageId = confirmation.generatedImageId;
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
    sessionStorage.setItem('findx-extracted-details', JSON.stringify(state.extractedDetails));
    sessionStorage.setItem('findx-generated-image-id', state.generatedImageId || '');
    // Step 3 (last seen & location) isn't built yet — this is the next page to add.
    window.location.href = 'last-seen.html';
  });

  skipImageBtn.addEventListener('click', () => {
    state.imageUrl = '';
    vizCard.style.display = 'none';
    matchRow.style.display = 'none';
    continueRow.style.display = 'flex';
  });

  /* ---------------- kick off the conversation ---------------- */

  function start() {
    addMessage('I will ask only for details that are still useful for identifying your item.', 'ai');
    askAdaptiveQuestion({
      prompt: state.description || `What is the item called?`,
      initialQuestion: state.description ? '' : 'What is the item called?',
      placeholder: 'Describe one identifying detail…',
      onAnswer: () => {},
    });
  }

  function askAdaptiveQuestion(nextStep) {
    const handleUserAnswer = async (text) => {
      if (text && text.trim()) {
        state.conversation.push({ role: 'user', content: text.trim() });
      }
      const followUp = await fetchFollowUpQuestion();
      mergeExtractedDetails(followUp?.extractedDetails);
      const questionCount = state.conversation.filter((entry) => entry.role === 'user').length;
      if (followUp?.readyToGenerate || questionCount >= 4 || !followUp?.question) {
        runGeneration();
        return;
      }
      askQuestion({ prompt: followUp.question, placeholder: 'Type your answer…', onAnswer: handleUserAnswer });
    };

    const initial = nextStep.initialQuestion !== undefined ? nextStep.initialQuestion : nextStep.prompt;
    if (!initial) return handleUserAnswer('');
    askQuestion({
      prompt: initial,
      chips: [],
      placeholder: nextStep.placeholder || 'Type your answer…',
      onAnswer: handleUserAnswer,
    });
  }

  function askItemName() {
    askAdaptiveQuestion({
      prompt: state.mode === 'upload' ? "What's the item called?" : "What's the item called?",
      placeholder: 'e.g. backpack, water bottle…',
      onAnswer: (text) => {
        const clean = text.trim();
        if (clean) state.itemName = clean;
        askDetails();
      },
    });
  }

  function askDetails() {
    askAdaptiveQuestion({
      prompt: 'Any distinguishing details — brand, marks, condition?',
      placeholder: 'Type details, or "skip"',
      onAnswer: (text) => {
        const answer = text.trim();
        if (answer && !/^skip$/i.test(answer)) state.details = answer;
        askColor();
      },
    });
  }

  function askColor() {
    askAdaptiveQuestion({
      prompt: 'What color is it, mostly?',
      chips: ['Black', 'White', 'Blue', 'Red', 'Green', 'Other'],
      placeholder: 'Or type a color…',
      onAnswer: (text) => {
        const answer = text.trim();
        if (answer) state.color = answer;
        askBrand();
      },
    });
  }

  function askBrand() {
    askAdaptiveQuestion({
      prompt: 'Any brand or make? (Skip if not sure)',
      chips: ['Not sure / skip'],
      placeholder: 'Type a brand…',
      onAnswer: (text) => {
        const answer = text.trim();
        if (answer && !/skip|not sure/i.test(answer)) state.brand = answer;
        runGeneration();
      },
    });
  }

  start();
});
