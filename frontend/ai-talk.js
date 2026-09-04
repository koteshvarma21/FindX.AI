/* ============================================================
   FindX.AI — AI item description assistant (ai-talk.html)

   Drives the chat UI and wires it to the real backend:
     POST /api/images/generate  -> turns a text description into
                                    an AI-generated image
     POST /api/images/confirm   -> saves the description + image
                                    once the user says it's close enough

   Uploaded photos are analyzed by the backend when a vision-capable
   provider model is configured. Image generation remains optional.
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
      itemName: '',
      category: '',
      color: '',
      brand: '',
      size: '',
      material: '',
      model: '',
      visualDescription: '',
      uniqueFeatures: [],
    },
  };
  try { mergeExtractedDetails(JSON.parse(sessionStorage.getItem('findx-extracted-details') || '{}')); } catch (_error) { }

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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || (!body?.question && !body?.readyToGenerate)) {
        return null;
      }
      return body;
    } catch (error) {
      console.error('AI follow-up request failed:', error.message);
      return null;
    }
  }

  function mergeExtractedDetails(details = {}) {
    const previous = state.extractedDetails;
    const value = (candidate, existing) => typeof candidate === 'string' && candidate.trim() ? candidate.trim() : existing;
    state.extractedDetails = {
      itemName: value(details.itemName, previous.itemName),
      category: value(details.category, previous.category),
      color: value(details.color, previous.color),
      brand: value(details.brand, previous.brand),
      size: value(details.size, previous.size),
      material: value(details.material, previous.material),
      model: value(details.model, previous.model),
      visualDescription: value(details.visualDescription, previous.visualDescription),
      uniqueFeatures: [...new Set([
        ...previous.uniqueFeatures,
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
    const details = state.extractedDetails;
    const parts = [state.description, state.itemName, details.category, details.color, details.brand,
      details.size, details.material, details.model, details.visualDescription,
      details.uniqueFeatures.join(', '), state.details, ...state.improvements];
    return [...new Set(parts.map((part) => String(part || '').trim()).filter(Boolean))].join('. ');
  }

  async function runGeneration() {
    matchRow.style.display = 'none';
    continueRow.style.display = 'flex';
    addMessage("Give me a second — picturing that now…", 'ai');
    try {
      const { imageUrl } = await generateImage(buildDescription(), state.improvements);
      state.imageUrl = imageUrl;
      vizImage.src = window.resolveFindxAssetUrl ? window.resolveFindxAssetUrl(imageUrl) : imageUrl;
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

  const accuracyRange = document.getElementById('accuracy-range');
  const accuracyValue = document.getElementById('accuracy-value');
  const accuracySubmit = document.getElementById('accuracy-submit');
  accuracyRange.addEventListener('input', () => { accuracyValue.textContent = `${accuracyRange.value}%`; });
  accuracySubmit.addEventListener('click', async () => {
      const accuracy = Number(accuracyRange.value);
      sessionStorage.setItem('findx-image-confidence', String(accuracy));

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

  continueBtn.addEventListener('click', () => {
    sessionStorage.setItem('findx-final-description', buildDescription());
    sessionStorage.setItem('findx-final-image', state.imageUrl);
    sessionStorage.setItem('findx-extracted-details', JSON.stringify(state.extractedDetails));
    sessionStorage.setItem('findx-generated-image-id', state.generatedImageId || '');
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
    const hasExistingDetails = Boolean(state.description || state.extractedDetails.itemName || state.extractedDetails.category);
    askAdaptiveQuestion({
      prompt: 'What is the item called?',
      initialQuestion: hasExistingDetails ? '' : 'What is the item called?',
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

  start();
});
