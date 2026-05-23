/* D²nAI Radar Intrants — raw-material price event-radar.
   Watchlist (view + feed) is kept in the browser (localStorage). The signal is
   generated server-side via the WP REST proxy (/dnai/v1/radar), which calls the
   AI Lab — so no CORS and the API key never reaches the browser. */
(function () {
  var root = document.querySelector('.dnai-radar');
  if (!root || typeof DNAI_RADAR === 'undefined') return;

  var MATERIAL = root.getAttribute('data-material') || 'Soufre';
  var LS_WL = 'dnai_radar_watchlist_v1', LS_HIST = 'dnai_radar_history_v1';

  var CATEGORIES = [
    'Producteurs & exportateurs',
    'Logistique & routes',
    'Demande',
    'Marché & prix',
    'Événements à surveiller'
  ];

  var SEED = [
    ['Producteurs & exportateurs', 'Arabie Saoudite'], ['Producteurs & exportateurs', 'Émirats (ADNOC)'],
    ['Producteurs & exportateurs', 'Qatar'], ['Producteurs & exportateurs', 'Iran'],
    ['Producteurs & exportateurs', 'Russie'], ['Producteurs & exportateurs', 'Kazakhstan (Tengiz)'],
    ['Producteurs & exportateurs', 'Canada'], ['Producteurs & exportateurs', 'États-Unis'],
    ['Producteurs & exportateurs', 'Chine'],
    ['Logistique & routes', "Détroit d'Ormuz"], ['Logistique & routes', 'Mer Rouge / Bab-el-Mandeb'],
    ['Logistique & routes', 'Mer Noire'], ['Logistique & routes', 'Port de Vancouver'],
    ['Logistique & routes', 'Taux de fret maritime'],
    ['Demande', 'Engrais phosphatés (acide sulfurique)'], ['Demande', 'Lixiviation des métaux'],
    ['Demande', 'Activité raffinage / gaz acide'],
    ['Marché & prix', 'Prix pétrole / gaz'], ['Marché & prix', 'World Bank Pink Sheet'],
    ['Marché & prix', 'Soufre CFR Chine / FOB Moyen-Orient'],
    ['Événements à surveiller', 'Sanctions Russie / Iran'], ['Événements à surveiller', 'Restrictions export Chine'],
    ['Événements à surveiller', 'Conflits au Moyen-Orient'], ['Événements à surveiller', 'Ouragans Golfe du Mexique'],
    ['Événements à surveiller', 'Arrêts de raffineries']
  ].map(function (x, i) { return { id: 's' + i, cat: x[0], label: x[1] }; });

  var watchlist = [], history = [], lastSignalText = '', busy = false;

  function $(id) { return root.querySelector('#' + id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function todayFr() { return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function field(text, re) { var m = text.match(re); return m ? m[1].trim() : ''; }
  function dirClass(s) { if (/hausse|↑/i.test(s)) return ['up', '↑']; if (/baisse|↓/i.test(s)) return ['down', '↓']; return ['flat', '→']; }

  /* ---------- storage ---------- */
  function load() {
    try { watchlist = JSON.parse(localStorage.getItem(LS_WL)) || SEED.slice(); } catch (e) { watchlist = SEED.slice(); }
    try { history = JSON.parse(localStorage.getItem(LS_HIST)) || []; } catch (e) { history = []; }
  }
  function saveWL() { localStorage.setItem(LS_WL, JSON.stringify(watchlist)); }
  function saveHist() { localStorage.setItem(LS_HIST, JSON.stringify(history)); }

  /* ---------- watchlist ---------- */
  function renderWatchlist() {
    var wrap = $('dnai-radar-watchlist'); wrap.innerHTML = '';
    CATEGORIES.forEach(function (cat) {
      var items = watchlist.filter(function (w) { return w.cat === cat; });
      if (!items.length) return;
      var div = document.createElement('div'); div.className = 'dnai-radar-wlcat';
      div.innerHTML = '<h4>' + esc(cat) + '</h4>';
      var chips = document.createElement('div'); chips.className = 'dnai-radar-chips';
      items.forEach(function (it) {
        var c = document.createElement('span'); c.className = 'dnai-radar-chip';
        c.innerHTML = esc(it.label) + ' <span class="x" title="Retirer">×</span>';
        c.querySelector('.x').addEventListener('click', function () {
          watchlist = watchlist.filter(function (w) { return w.id !== it.id; }); saveWL(); renderWatchlist();
        });
        chips.appendChild(c);
      });
      div.appendChild(chips); wrap.appendChild(div);
    });
    if (!watchlist.length) wrap.innerHTML = '<div class="dnai-radar-wlempty">Watchlist vide — ajoutez des éléments à surveiller ci-dessous.</div>';
  }
  function watchlistText() {
    var s = '';
    CATEGORIES.forEach(function (cat) {
      var items = watchlist.filter(function (w) { return w.cat === cat; });
      if (items.length) s += '\n[' + cat + '] ' + items.map(function (i) { return i.label; }).join(', ');
    });
    return s.replace(/^\n/, '');
  }

  /* ---------- generate ---------- */
  function generate() {
    if (busy) return;
    busy = true;
    var btn = $('dnai-radar-gen'), think = $('dnai-radar-think'), sig = $('dnai-radar-signal');
    btn.disabled = true; sig.classList.remove('show'); think.classList.add('show');

    function done() { busy = false; btn.disabled = false; think.classList.remove('show'); }

    fetch(DNAI_RADAR.rest + '/radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': DNAI_RADAR.nonce },
      body: JSON.stringify({ watchlist: watchlistText() })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.reply) { renderSignal(res.j.reply); pushHistory(res.j.reply); done(); return; }
        if (res.status === 503 || (res.j && res.j.error === 'not_configured')) {
          renderSignal(DEMO_SIGNAL()); done(); return; // demo fallback until admin configures the model
        }
        renderSignal('⚠️ Échec de la génération.\n\n' + ((res.j && (res.j.message || res.j.error)) || ('HTTP ' + res.status)) +
          '\n\nVérifiez le modèle radar et la clé API dans les réglages D²nAI Portal.');
        done();
      })
      .catch(function () {
        renderSignal('⚠️ Erreur réseau — le AI Lab tarde à répondre. Réessayez dans un instant.');
        done();
      });
  }

  /* ---------- render ---------- */
  function linkify(t) { return esc(t).replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  function renderSignal(text) {
    lastSignalText = text;
    var sig = $('dnai-radar-signal');
    var dirRaw = field(text, /Signal\s*:\s*(.+)/i);
    var conf = field(text, /Confiance\s*:\s*(Faible|Moyenne|Élevée|Elevee|Elevée)/i);
    var date = field(text, /Date\s*:\s*(.+)/i) || todayFr();
    var dc = dirClass(dirRaw);
    var d = $('dnai-radar-dir'); d.className = 'dnai-radar-dir ' + dc[0]; d.textContent = dc[1];
    $('dnai-radar-date').textContent = date;
    $('dnai-radar-sigtitle').textContent = dirRaw ? (MATERIAL + ' · ' + dirRaw.replace(/[↑↓→]/g, '').trim()) : MATERIAL;
    var cf = $('dnai-radar-conf');
    if (conf) { var lc = conf.toLowerCase(); cf.textContent = 'Confiance ' + conf; cf.className = 'dnai-radar-conf ' + (/élev|elev/.test(lc) ? 'high' : /moy/.test(lc) ? 'mid' : 'low'); }
    else { cf.textContent = '—'; cf.className = 'dnai-radar-conf low'; }
    $('dnai-radar-bodytext').innerHTML = linkify(text);
    sig.classList.add('show');
  }

  /* ---------- history ---------- */
  function pushHistory(text) {
    history.unshift({ ts: Date.now(), dir: field(text, /Signal\s*:\s*(.+)/i), conf: field(text, /Confiance\s*:\s*(Faible|Moyenne|Élevée|Elevee|Elevée)/i), text: text });
    history = history.slice(0, 30); saveHist(); renderHistory();
  }
  function renderHistory() {
    var list = $('dnai-radar-histlist'); list.innerHTML = '';
    $('dnai-radar-clear').style.display = history.length ? 'inline' : 'none';
    if (!history.length) { list.innerHTML = '<div class="dnai-radar-histempty">Aucun signal encore. Générez le premier radar pour démarrer le track record.</div>'; return; }
    history.forEach(function (h) {
      var dc = dirClass(h.dir);
      var row = document.createElement('div'); row.className = 'dnai-radar-hrow';
      var dt = new Date(h.ts);
      row.innerHTML = '<div class="dnai-radar-dir ' + dc[0] + '" style="width:30px;height:30px;font-size:14px">' + dc[1] + '</div>' +
        '<div class="dnai-radar-ht"><div class="a">' + esc((h.dir || 'Signal').replace(/[↑↓→]/g, '').trim() || 'Signal') + (h.conf ? (' · ' + esc(h.conf)) : '') + '</div>' +
        '<div class="b">' + dt.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div></div>';
      row.addEventListener('click', function () { renderSignal(h.text); $('dnai-radar-signal').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
      list.appendChild(row);
    });
  }

  /* ---------- demo ---------- */
  function DEMO_SIGNAL() {
    return '📅 Date : ' + todayFr() + '\n' +
      '🧪 Matière : Soufre\n' +
      '📈 Signal : ↑ Hausse\n' +
      '⏳ Horizon : court terme (0–3 mois)\n' +
      '🎚️ Confiance : Moyenne\n' +
      '💲 Prix de référence connu : ~145 $/t CFR Chine (avr. 2026, World Bank Pink Sheet) — exemple\n\n' +
      '🔑 Facteurs clés (exemple de démonstration) :\n' +
      "- Tensions logistiques en mer Rouge qui rallongent les routes depuis le Moyen-Orient et renchérissent le fret.\n" +
      '- Maintenance programmée sur plusieurs unités de récupération de soufre dans le Golfe → offre resserrée à court terme.\n' +
      "- Demande d'acide sulfurique soutenue côté engrais phosphatés à l'approche de la saison.\n\n" +
      '🧭 Lecture analyste :\n' +
      "Le contexte penche vers une pression haussière de court terme, surtout d'origine logistique et d'offre. Le signal serait invalidé par une détente rapide du fret ou un redémarrage anticipé des unités en maintenance.\n\n" +
      '🛒 Implication achat :\n' +
      "Envisager de sécuriser une partie des besoins T+1 maintenant plutôt que d'attendre ; éviter de constituer un stock massif tant que la tendance n'est pas confirmée sur 2–3 semaines.\n\n" +
      '🔗 Sources :\n' +
      'Données fictives — exemple de démonstration. Configurez le modèle radar dans les réglages D²nAI Portal pour des signaux réels et sourcés.';
  }

  /* ---------- init ---------- */
  load();
  var sel = $('dnai-radar-addcat');
  CATEGORIES.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });

  $('dnai-radar-addform').addEventListener('submit', function (e) {
    e.preventDefault();
    var label = $('dnai-radar-addlabel').value.trim();
    if (!label) return;
    watchlist.push({ id: 'u' + Date.now(), cat: $('dnai-radar-addcat').value, label: label });
    saveWL(); renderWatchlist(); $('dnai-radar-addlabel').value = '';
  });
  $('dnai-radar-reset').addEventListener('click', function () {
    if (confirm('Réinitialiser la watchlist avec la liste de départ ?')) { watchlist = SEED.slice(); saveWL(); renderWatchlist(); }
  });
  $('dnai-radar-gen').addEventListener('click', generate);
  $('dnai-radar-regen').addEventListener('click', generate);
  $('dnai-radar-copy').addEventListener('click', function () { if (lastSignalText && navigator.clipboard) navigator.clipboard.writeText(lastSignalText); });
  $('dnai-radar-clear').addEventListener('click', function () {
    if (confirm("Effacer tout l'historique des signaux ?")) { history = []; saveHist(); renderHistory(); }
  });

  renderWatchlist();
  renderHistory();
})();
