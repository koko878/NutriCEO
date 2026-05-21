/* D²nAI Intake Genie — chat widget. Talks to the WP REST proxy (/dnai/v1/chat),
   detects the [[BRIEF]]{...}[[/BRIEF]] block, saves it (/dnai/v1/need) and shows a recap. */
(function () {
  var root = document.querySelector('.dnai-chat');
  if (!root || typeof DNAI === 'undefined') return;

  var thread = root.querySelector('#dnai-thread');
  var input  = root.querySelector('#dnai-input');
  var send   = root.querySelector('#dnai-send');
  var history = []; // [{role, content}]
  var busy = false;

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
      body: JSON.stringify({ brief: brief })
    }).then(function (r) { return r.json(); }).then(function (res) {
      var s = card.querySelector('.dnai-sent span');
      s.textContent = res && res.ok
        ? (brief.lang === 'en' ? 'Sent to the D²nAI team — they will reach out.' : "Transmis à l'équipe D²nAI — elle reviendra vers vous.")
        : 'Saved locally.';
    }).catch(function () {
      card.querySelector('.dnai-sent span').textContent = 'Saved.';
    });
  }

  function ask(text) {
    if (busy || !text.trim()) return;
    busy = true; send.disabled = true;
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    input.value = ''; autosize();
    var typing = addTyping();

    fetch(DNAI.rest + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': DNAI.nonce },
      body: JSON.stringify({ messages: history })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        typing.remove();
        if (!res.ok || !res.j || !res.j.reply) {
          addError((res.j && res.j.error) ? res.j.error : 'AI Lab error.');
          return;
        }
        var reply = res.j.reply;
        history.push({ role: 'assistant', content: reply });
        var parsed = extractBrief(reply);
        if (parsed.clean) addMsg('bot', parsed.clean);
        if (parsed.brief) { var card = renderBrief(parsed.brief); saveBrief(parsed.brief, card); }
      })
      .catch(function () { typing.remove(); addError('Network error.'); })
      .finally(function () { busy = false; send.disabled = false; input.focus(); });
  }

  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); }
  });
  send.addEventListener('click', function () { ask(input.value); });
})();
