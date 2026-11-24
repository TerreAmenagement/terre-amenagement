(function () {
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  var quick = document.getElementById('quick-form');

  var ADR = 'contact@terre-amenagement.fr';
  /* Clé d'envoi Web3Forms : publique par conception (elle ne permet que d'écrire à contact@). */
  var W3F_KEY = 'a27295b0-e4bb-4724-bede-8a36331fd0d6';
  var W3F_URL = 'https://api.web3forms.com/submit';
  var mailOk = function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); };

  /* Secours : ouvre la messagerie du visiteur et propose le copier/coller */
  function secours(sujet, corps, box, intro) {
    var href = 'mailto:' + ADR + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
    box.innerHTML = '';
    var p = document.createElement('p');
    p.innerHTML = intro + ' Copiez le message ci-dessous et envoyez-le à <b>' + ADR + '</b>, ou ouvrez votre messagerie.';
    var ta = document.createElement('textarea'); ta.readOnly = true; ta.value = corps; ta.rows = 7; ta.setAttribute('aria-label', 'Message à envoyer');
    var row = document.createElement('div'); row.className = 'mf-actions';
    var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'btn'; b1.textContent = 'Copier le message';
    var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn outline'; b2.textContent = 'Copier l’adresse';
    var b3 = document.createElement('a'); b3.className = 'btn outline'; b3.href = href; b3.textContent = 'Ouvrir ma messagerie';
    function copier(txt, btn, ok) {
      var done = function () { btn.textContent = ok; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { ta.select(); });
      else { ta.select(); try { document.execCommand('copy'); done(); } catch (er) {} }
    }
    b1.onclick = function () { copier('Objet : ' + sujet + '\n\n' + corps, b1, 'Message copié'); };
    b2.onclick = function () { copier(ADR, b2, 'Adresse copiée'); };
    row.appendChild(b1); row.appendChild(b2); row.appendChild(b3);
    box.appendChild(p); box.appendChild(ta); box.appendChild(row);
    box.hidden = false;
  }

  /* Envoi direct vers contact@ (Web3Forms) ; en cas d'échec, solution de secours */
  function envoyer(sujet, champs, f, box, ok) {
    var corps = champs.map(function (c) { return c[0] ? c[0] + ' : ' + c[1] : '\n' + c[1]; }).join('\n');
    var btn = f.querySelector('button[type=submit]');
    var piege = f.querySelector('input[name=botcheck]');
    if (piege && piege.checked) { ok(); return; }
    var data = { access_key: W3F_KEY, subject: sujet, from_name: 'Site terre-amenagement.fr', botcheck: false };
    champs.forEach(function (c) { data[c[0] || 'Message'] = c[1]; });
    data.email = data['E-mail']; data.replyto = data['E-mail']; delete data['E-mail'];
    box.hidden = true;
    var lib = btn.innerHTML; btn.disabled = true; btn.textContent = 'Envoi en cours…';
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch(W3F_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        if (!j || !j.success) throw new Error('refus');
        f.reset(); ok();
      })
      .catch(function () {
        secours(sujet, corps, box, '<strong>L’envoi n’a pas abouti.</strong>');
      })
      .then(function () { clearTimeout(t); btn.disabled = false; btn.innerHTML = lib; });
  }

  /* Tuile verte : étape 1 puis étape 2, sans quitter le haut de page */
  var q2 = document.getElementById('quick-step2');
  var qData = {};
  quick.addEventListener('submit', function (e) {
    e.preventDefault();
    qData = { commune: quick.commune.value.trim(), type: quick.type.value, surface: quick.surface.value.trim() };
    var recap = qData.type + (qData.commune ? ' à ' + qData.commune : '') + (qData.surface ? ', ' + qData.surface + ' m²' : '') + '.';
    document.getElementById('q-recap').textContent = recap;
    quick.hidden = true; q2.hidden = false;
    q2.nom.focus({ preventScroll: true });
  });
  document.getElementById('q-back').addEventListener('click', function () {
    q2.hidden = true; quick.hidden = false; document.getElementById('q-fallback').hidden = true;
    quick.commune.focus({ preventScroll: true });
  });
  q2.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('q-err');
    var nom = q2.nom.value.trim(), email = q2.email.value.trim();
    if (!nom || !mailOk(email)) {
      err.textContent = 'Indiquez votre nom et une adresse e-mail valide.';
      (nom ? q2.email : q2.nom).focus(); return;
    }
    err.textContent = '';
    envoyer('Demande d’étude · ' + (qData.commune || nom), [
      ['Profil', 'Propriétaire'],
      ['Nom', nom],
      ['E-mail', email],
      ['Téléphone', q2.tel.value.trim() || '-'],
      ['Commune du bien', qData.commune || '-'],
      ['Type de bien', qData.type],
      ['Surface du terrain', qData.surface ? qData.surface + ' m²' : '-']
    ], q2, document.getElementById('q-fallback'), function () {
      var fb = document.getElementById('q-fallback');
      fb.innerHTML = '<p><strong>Merci, votre demande est bien envoyée.</strong> Nous revenons vers vous rapidement.</p>';
      fb.hidden = false;
    });
  });

  /* Formulaire de contact (bas de page) */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nom = form.nom.value.trim();
    var email = form.email.value.trim();
    if (!nom || !mailOk(email)) {
      status.className = 'form-status err';
      status.textContent = 'Indiquez votre nom et une adresse e-mail valide.';
      (nom ? form.email : form.nom).focus();
      return;
    }
    status.className = 'form-status'; status.textContent = '';
    envoyer('Demande d’étude · ' + (form.commune.value.trim() || nom), [
      ['Profil', form.profil.value],
      ['Nom', nom],
      ['E-mail', email],
      ['Téléphone', form.tel.value.trim() || '-'],
      ['Commune du bien', form.commune.value.trim() || '-'],
      ['', form.message.value.trim() || '-']
    ], form, document.getElementById('c-fallback'), function () {
      status.className = 'form-status';
      status.textContent = 'Merci, votre demande est bien envoyée. Nous revenons vers vous rapidement.';
    });
  });
  /* Avant / Après */
  var stage = document.getElementById('stage');
  var scenes = ['division', 'surelevation', 'destination', 'logements'];
  var current = 0, timers = [], auto = true;
  var chip = document.getElementById('stage-chip');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clear() { timers.forEach(clearTimeout); timers = []; }
  function setState(st) { stage.setAttribute('data-state', st); chip.textContent = st === 'avant' ? 'Avant' : 'Après'; }
  function showScene(i, animate) {
    current = i;
    var name = scenes[i];
    scenes.forEach(function (n) {
      var t = document.getElementById('tab-' + n), p = document.getElementById('txt-' + n);
      t.setAttribute('aria-selected', n === name ? 'true' : 'false');
      t.tabIndex = n === name ? 0 : -1;
      p.hidden = n !== name;
    });
    stage.setAttribute('data-scene', name);
    if (animate && !reduce) {
      setState('avant');
      timers.push(setTimeout(function () { setState('apres'); }, 1400));
    } else { setState('apres'); }
  }
  function cycle() {
    if (!auto) return;
    timers.push(setTimeout(function () {
      if (!auto) return;
      showScene((current + 1) % scenes.length, true);
      cycle();
    }, 6500));
  }
  function stopAuto() { auto = false; clear(); }
  scenes.forEach(function (n, i) {
    document.getElementById('tab-' + n).addEventListener('click', function () { stopAuto(); showScene(i, true); });
  });
  document.querySelector('.tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    stopAuto();
    var i = (current + (e.key === 'ArrowRight' ? 1 : scenes.length - 1)) % scenes.length;
    showScene(i, true);
    document.getElementById('tab-' + scenes[i]).focus();
  });
  stage.querySelectorAll('.switch button').forEach(function (b) {
    b.addEventListener('click', function () { stopAuto(); setState(b.getAttribute('data-set')); });
  });
  if (!reduce) {
    var started = false;
    function start() { if (started) return; started = true; showScene(0, true); cycle(); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { start(); io.disconnect(); } }, { threshold: 0.35 });
      io.observe(stage);
    } else { start(); }
  }
  /* Repères de prix (DVF) */
  var eForm = document.getElementById('estim-form');
  var eType = document.getElementById('e-type');
  var eSurf = document.getElementById('e-surface');
  var eCom = document.getElementById('e-commune');
  var eErr = document.getElementById('estim-error');
  var DVF = null, byName = {};
  var nf = new Intl.NumberFormat('fr-FR');
  var norm = function (t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
  var mois = function (d) { if (!d) return ''; var x = new Date(d); return x.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); };
  var label = function (code, nom) { return nom + ' (' + code.slice(0, 2) + ')'; };

  eType.addEventListener('change', function () {
    document.getElementById('e-surface-label').textContent = eType.value === 'terrain' ? 'Surface du terrain (m²)' : 'Surface habitable (m²)';
    eSurf.placeholder = eType.value === 'terrain' ? 'Ex. 600' : 'Ex. 110';
  });

  fetch('data/prix-dvf.json').then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (d) {
    DVF = d;
    var dl = document.getElementById('e-communes');
    Object.keys(d.communes).forEach(function (code) {
      var c = d.communes[code], lab = label(code, c.nom);
      byName[norm(lab)] = code; byName[norm(c.nom)] = byName[norm(c.nom)] || code;
      var o = document.createElement('option'); o.value = lab; dl.appendChild(o);
    });
    if (d.meta.demo) document.getElementById('estim-demo').hidden = false;
    else {
      document.querySelectorAll('[data-needs-data]').forEach(function (el) { el.hidden = false; });
      var tp = document.querySelector('[data-tile-prix]');
      if (tp) { tp.href = '#prix'; tp.querySelector('[data-label-prix]').textContent = 'Prix du marché'; tp.querySelector('[data-value-prix]').textContent = 'Votre commune'; }
    }
    if (d.meta.fin) document.getElementById('estim-src').textContent += ' Ventes de ' + mois(d.meta.debut) + ' à ' + mois(d.meta.fin) + '. Mise à jour : ' + new Date(d.meta.maj).toLocaleDateString('fr-FR') + '.';
  }).catch(function () {
    eErr.textContent = 'Les repères de prix sont momentanément indisponibles.';
  });

  eForm.addEventListener('submit', function (e) {
    e.preventDefault();
    eErr.textContent = '';
    if (!DVF) { eErr.textContent = 'Les données sont en cours de chargement. Réessayez dans un instant.'; return; }
    var code = byName[norm(eCom.value)];
    var surf = parseFloat(String(eSurf.value).replace(/\s/g, '').replace(',', '.'));
    if (!code) { eErr.textContent = 'Choisissez une commune dans la liste proposée.'; eCom.focus(); return; }
    if (!(surf > 0)) { eErr.textContent = 'Indiquez une surface en m².'; eSurf.focus(); return; }
    var c = DVF.communes[code], t = eType.value, st = c[t];
    var noms = { maison: 'Maison', appartement: 'Appartement', terrain: 'Terrain à bâtir' };
    document.getElementById('estim-empty').hidden = true;
    var out = document.getElementById('estim-out'); out.hidden = false;
    document.getElementById('o-what').textContent = noms[t] + ' · ' + nf.format(surf) + ' m² · ' + c.nom;
    var warn = document.getElementById('o-warn');
    if (!st) {
      document.getElementById('o-range').textContent = 'Pas assez de ventes';
      document.getElementById('o-sub').textContent = 'Trop peu de ventes de ce type ont été enregistrées dans cette commune pour donner un repère.';
      ['o-p25','o-p50','o-p75'].forEach(function (id) { document.getElementById(id).textContent = ''; });
      warn.hidden = true;
    } else {
      var r1000 = function (x) { return Math.round(x / 1000) * 1000; };
      document.getElementById('o-range').textContent = nf.format(r1000(st.p25 * surf)) + ' € – ' + nf.format(r1000(st.p75 * surf)) + ' €';
      document.getElementById('o-sub').textContent = 'Prix médian : ' + nf.format(st.p50) + ' €/m² · ' + nf.format(st.n) + ' ventes analysées';
      document.getElementById('o-p25').textContent = nf.format(st.p25) + ' €/m²';
      document.getElementById('o-p50').textContent = nf.format(st.p50) + ' €/m²';
      document.getElementById('o-p75').textContent = nf.format(st.p75) + ' €/m²';
      var notes = [];
      if (st.n < 15) notes.push('Peu de ventes : repère à prendre avec prudence.');
      if (t === 'terrain') notes.push('Le prix d’un terrain dépend surtout de ce que le PLU permet d’y construire. Un jardin à diviser n’est pas encore un terrain à bâtir viabilisé.');
      warn.textContent = notes.join(' '); warn.hidden = !notes.length;
    }
    document.getElementById('o-cta').onclick = function () {
      form.commune.value = c.nom;
      form.message.value = 'Type de bien : ' + noms[t] + '\nSurface : ' + nf.format(surf) + ' m²' + (form.message.value ? '\n' + form.message.value : '');
    };
  });
  /* Effets d'apparition */
  if (!reduce && 'IntersectionObserver' in window) {
    var sel = '.section-head, .card, .steps li, .values li, .partners li, .faq details, .owner-col, .checklist, .stage, .transfo-side, .estim-form, .estim-result, .coords dl > div, .contact-form';
    var items = Array.prototype.slice.call(document.querySelectorAll(sel));
    var vh = window.innerHeight || 800;
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > vh * 0.92) {
        var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.setProperty('--i', Math.min(sib, 6));
        el.classList.add('rv');
      } else { el.classList.add('in'); }
    });
    var ob = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); ob.unobserve(x.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { if (el.classList.contains('rv')) ob.observe(el); });
    document.querySelectorAll('.hl, .kicker').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh) { el.classList.add('in'); return; }
      ob.observe(el);
    });
    setTimeout(function () { items.forEach(function (el) { el.classList.add('in'); }); document.querySelectorAll('.hl, .kicker').forEach(function (el) { el.classList.add('in'); }); }, 6000);

    /* Inclinaison des cartes au survol */
    if (window.matchMedia('(hover: hover)').matches) {
      document.querySelectorAll('.card').forEach(function (card) {
        card.addEventListener('pointermove', function (ev) {
          var b = card.getBoundingClientRect();
          var x = (ev.clientX - b.left) / b.width - 0.5, y = (ev.clientY - b.top) / b.height - 0.5;
          card.style.transform = 'perspective(900px) rotateY(' + (x * 6) + 'deg) rotateX(' + (-y * 6) + 'deg) translateY(-4px)';
        });
        card.addEventListener('pointerleave', function () { card.style.transform = ''; });
      });
    }
  } else {
    document.querySelectorAll('.hl, .kicker').forEach(function (el) { el.classList.add('in'); });
  }
})();
