/* D²nAI Intake Genie — chat widget. Talks to the WP REST proxy (/dnai/v1/chat),
   detects the [[BRIEF]]{...}[[/BRIEF]] block, saves it (/dnai/v1/need) and shows a recap. */
(function () {
  var root = document.querySelector('.dnai-chat');
  if (!root || typeof DNAI === 'undefined') return;

  var thread = root.querySelector('#dnai-thread');
  var input  = root.querySelector('#dnai-input');
  var send   = root.querySelector('#dnai-send');
  var history = []; // [{role, content}]
  var atts = [];    // [{id,url,name,type,text}]
  var busy = false;
  var EN = (navigator.language || '').toLowerCase().indexOf('en') === 0;

  function buildContext() {
    if (!atts.length) return '';
    return atts.map(function (a) {
      return 'FILE: ' + a.name + (a.text ? '\n' + a.text : ' (binary file — not text-extracted)');
    }).join('\n\n---\n\n');
  }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function scroll() { thread.scrollTop = thread.scrollHeight; }

  function addMsg(role, text) {
    var m = el('div', 'dnai-msg ' + (role === 'user' ? 'user' : 'bot'), text);
    thread.appendChild(m); scroll(); return m;
  }
  function addTyping() {
    var t = el('div', 'dnai-typing'); t.innerHTML = '<i></i><i></i><i></i>';
    thread.appendChild(t); scroll(); return t;
  }
  function addError(msg) { var e = el('div', 'dnai-err', msg); thread.appendChild(e); scroll(); }

  /* opener */
  addMsg('bot', root.getAttribute('data-opener') || 'Hi 👋 describe your Data / Digital / AI need.');

  function extractBrief(text) {
    var m = text.match(/\[\[BRIEF\]\]([\s\S]*?)\[\[\/BRIEF\]\]/);
    if (!m) return { clean: text, brief: null };
    var brief = null;
    try { brief = JSON.parse(m[1].trim()); } catch (e) { brief = null; }
    var clean = text.replace(m[0], '').trim();
    return { clean: clean, brief: brief };
  }

  function renderBrief(brief) {
    var card = el('div', 'dnai-brief');
    var rows = [
      ['Category', (brief.category || '') + (brief.subcategory ? ' · ' + brief.subcategory : '')],
      ['Problem', brief.problem], ['Impacted', brief.impacted],
      ['Current', brief.current], ['Outcome', brief.outcome],
      ['Data sources', brief.data_sources], ['Sensitivity', brief.sensitivity],
      ['Volume', brief.volume], ['Urgency', brief.urgency],
      ['Sponsor', brief.sponsor], ['Success metric', brief.success_metric],
      ['Constraints', brief.constraints]
    ];
    var lis = rows.filter(function (r) { return r[1]; })
      .map(function (r) { return '<li><b>' + r[0] + ':</b> ' + String(r[1]).replace(/</g, '&lt;') + '</li>'; }).join('');
    card.innerHTML = '<span class="dnai-bcat">' + (brief.category || 'Need') + '</span>'
      + '<h4>' + String(brief.title || 'Captured need').replace(/</g, '&lt;') + '</h4>'
      + '<ul>' + lis + '</ul>'
      + '<div class="dnai-sent">✓ <span></span></div>';
    thread.appendChild(card); scroll();
    return card;
  }

  function saveBrief(brief, card) {
    fetch(DNAI.rest + '/need', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': DNAI.nonce },
      body: JSON.stringify({ brief: brief, attachments: atts.map(function (a) { return { id: a.id, name: a.name, url: a.url }; }) })
    }).then(function (r) { return r.json(); }).then(function (res) {
      var s = card.querySelector('.dnai-sent span');
      s.textContent = res && res.ok
        ? (brief.lang === 'en' ? 'Sent to the D²nAI team — they will reach out.' : "Transmis à l'équipe D²nAI — elle reviendra vers vous.")
        : 'Saved locally.';
    }).catch(function () {
      card.querySelector('.dnai-sent span').textContent = 'Saved.';
    });
  }

  var MAX_TRIES = 3;          // total attempts before giving up
  var ATTEMPT_TIMEOUT = 75000; // abort a single hung request (ms)

  function ask(text) {
    if (busy || !text.trim()) return;
    busy = true; send.disabled = true;
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    input.value = ''; autosize();

    var typing = addTyping();
    var note = el('div', 'dnai-wait');
    thread.appendChild(note);
    var waitTimer = setTimeout(function () {
      note.textContent = EN ? "We're thinking, please wait…" : 'On réfléchit, merci de patienter…';
      scroll();
    }, 4000);

    function cleanup() { clearTimeout(waitTimer); typing.remove(); note.remove(); }
    function done() { busy = false; send.disabled = false; input.focus(); }

    function handleReply(reply) {
      history.push({ role: 'assistant', content: reply });
      var parsed = extractBrief(reply);
      if (parsed.clean) addMsg('bot', parsed.clean);
      if (parsed.brief) { var card = renderBrief(parsed.brief); saveBrief(parsed.brief, card); }
    }

    function fail(msg) { cleanup(); addError(msg); done(); }

    function retry(n) {
      note.textContent = EN ? 'Still working on it, one moment…' : 'Toujours en cours, un instant…';
      scroll();
      setTimeout(function () { attempt(n + 1); }, 1200 * n);
    }

    function attempt(n) {
      var ctrl = window.AbortController ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, ATTEMPT_TIMEOUT) : null;

      fetch(DNAI.rest + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': DNAI.nonce },
        body: JSON.stringify({ messages: history, context: buildContext() }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
        .then(function (res) {
          if (to) clearTimeout(to);
          if (res.ok && res.j && res.j.reply) { cleanup(); handleReply(res.j.reply); done(); return; }
          if (n < MAX_TRIES && (res.status === 429 || res.status >= 500)) { retry(n); return; }
          fail((res.j && res.j.error) ? res.j.error : (EN ? 'AI Lab error.' : 'Erreur du AI Lab.'));
        })
        .catch(function () {
          if (to) clearTimeout(to);
          if (n < MAX_TRIES) { retry(n); return; }
          fail(EN ? 'The AI Lab is slow to respond. Please send your message again.'
                  : "Le AI Lab tarde à répondre. Merci de renvoyer votre message.");
        });
    }

    attempt(1);
  }

  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); }
  });
  send.addEventListener('click', function () { ask(input.value); });

  /* Voice input → record audio, transcribe server-side via the AI Lab (Whisper) */
  var mic = root.querySelector('#dnai-mic');
  if (mic) {
    var EN = (navigator.language || '').toLowerCase().indexOf('en') === 0;
    var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    if (!canRecord) {
      mic.style.display = 'none';
    } else {
      var recorder = null, chunks = [], recording = false, stream = null;

      function stopStream() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }

      mic.addEventListener('click', function () {
        if (busy || mic.disabled) return;
        if (recording) { try { recorder.stop(); } catch (e) {} return; }
        if (!window.isSecureContext) {
          addError(EN ? 'Voice needs a secure (HTTPS) page.' : 'Le micro nécessite une page sécurisée (HTTPS).');
          return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
          stream = s; chunks = [];
          recorder = new MediaRecorder(s);
          recorder.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = function () {
            stopStream(); recording = false; mic.classList.remove('rec');
            if (!chunks.length) return;
            transcribe(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
          };
          recorder.start();
          recording = true; mic.classList.add('rec');
        }).catch(function (err) {
          var name = err && err.name ? err.name : '';
          var m;
          var policyBlocked = false;
          try {
            if (document.featurePolicy && document.featurePolicy.allowsFeature && !document.featurePolicy.allowsFeature('microphone')) policyBlocked = true;
          } catch (e) {}
          if (policyBlocked) {
            m = EN ? 'Microphone disabled by the site security policy (Permissions-Policy header) — ask IT/hosting to allow microphone=(self).'
                   : "Micro désactivé par la politique de sécurité du site (en-tête Permissions-Policy) — demandez à l'IT/hébergeur d'autoriser microphone=(self).";
          } else if (name === 'NotAllowedError' || name === 'SecurityError') {
            m = EN ? 'Mic permission denied — check the site permission AND Windows Privacy → Microphone (allow desktop apps).'
                   : "Accès micro refusé — vérifiez l'autorisation du site ET Windows : Confidentialité → Microphone (autoriser les applis de bureau).";
          } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            m = EN ? 'No microphone found on this device.' : 'Aucun micro trouvé sur cet appareil.';
          } else if (name === 'NotReadableError') {
            m = EN ? 'Microphone is busy (used by another app).' : 'Micro occupé par une autre application.';
          } else {
            m = (EN ? 'Mic error [v1.2.2]: ' : 'Erreur micro [v1.2.2] : ') + (name || 'inconnue');
          }
          addError(m);
        });
      });

      function transcribe(blob) {
        mic.classList.add('busy'); mic.disabled = true;
        var type = blob.type || 'audio/webm';
        var ext = type.indexOf('ogg') > -1 ? 'ogg' : (type.indexOf('mp4') > -1 || type.indexOf('mpeg') > -1 ? 'mp4' : 'webm');
        var fd = new FormData();
        fd.append('audio', blob, 'audio.' + ext);
        fetch(DNAI.rest + '/transcribe', { method: 'POST', headers: { 'X-WP-Nonce': DNAI.nonce }, body: fd })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (!res.ok || !res.j || res.j.text === undefined) {
              addError((res.j && res.j.error) ? res.j.error : (EN ? 'Transcription error.' : 'Erreur de transcription.'));
              return;
            }
            var t = (res.j.text || '').trim();
            if (t) { input.value = (input.value ? input.value.trim() + ' ' : '') + t; autosize(); }
            input.focus();
          })
          .catch(function () { addError(EN ? 'Network error.' : 'Erreur réseau.'); })
          .finally(function () { mic.classList.remove('busy'); mic.disabled = false; });
      }
    }
  }

  /* File attachments → upload server-side, feed text as knowledge to the LLM */
  var attachBtn = root.querySelector('#dnai-attach');
  var fileInput = root.querySelector('#dnai-file');
  var attsBox   = root.querySelector('#dnai-atts');
  if (attachBtn && fileInput && attsBox) {
    var EN2 = (navigator.language || '').toLowerCase().indexOf('en') === 0;

    function renderChip(att) {
      var chip = el('div', 'dnai-chip');
      var label = el('span', null, att.name);
      var x = el('button', 'dnai-chip-x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Remove');
      x.addEventListener('click', function () {
        var i = atts.indexOf(att);
        if (i > -1) atts.splice(i, 1);
        chip.remove();
      });
      chip.appendChild(label);
      chip.appendChild(x);
      attsBox.appendChild(chip);
      return chip;
    }

    function uploadOne(file) {
      var chip = el('div', 'dnai-chip uploading');
      chip.appendChild(el('span', null, file.name));
      attsBox.appendChild(chip);
      var fd = new FormData();
      fd.append('file', file, file.name);
      fetch(DNAI.rest + '/upload', { method: 'POST', headers: { 'X-WP-Nonce': DNAI.nonce }, body: fd })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          chip.remove();
          if (!res.ok || !res.j || !res.j.url) {
            addError((res.j && res.j.error) ? res.j.error : (EN2 ? 'Upload failed.' : "Échec de l'envoi du fichier."));
            return;
          }
          atts.push(res.j);
          renderChip(res.j);
        })
        .catch(function () { chip.remove(); addError(EN2 ? 'Upload network error.' : "Erreur réseau (envoi)."); });
    }

    attachBtn.addEventListener('click', function () { if (!busy) fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var list = Array.prototype.slice.call(fileInput.files || []);
      list.forEach(uploadOne);
      fileInput.value = '';
    });
  }
})();
