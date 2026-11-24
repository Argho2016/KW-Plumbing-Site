/* Shared behaviour for every page: menu, entrance motion, pointer light and
   the booking form. The scroll engine is mounted by each page itself. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.documentElement.classList.add('kp-js');

  /* ----------------------------------------------------------------- menu -- */
  var btn = document.querySelector('.kp-menu-btn');
  var menu = document.getElementById('kp-menu');
  var main = document.querySelector('main');
  if (btn && menu) {
    var setMenu = function (open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.classList.toggle('is-open', open);
      menu.inert = !open;
      if (main) main.inert = open;
      document.documentElement.style.overflow = open ? 'hidden' : '';
      if (open) { var first = menu.querySelector('a'); if (first) setTimeout(function () { first.focus(); }, reduce ? 0 : 320); }
    };
    menu.inert = true;
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); } });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  /* ------------------------------------------------------ entrance motion -- */
  var seen = function (el) { el.classList.add('is-in'); };
  var targets = [].slice.call(document.querySelectorAll('.kp-lines, [data-kp-draw]'));
  if (reduce || !('IntersectionObserver' in window)) targets.forEach(seen);
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { seen(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.2 });
    targets.forEach(function (el) {
      if (el.hasAttribute('data-kp-load')) (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(function () { seen(el); }, 80); });
      else io.observe(el);
    });
  }

  /* -------------------------------------------------------- pointer light -- */
  if (fine && !reduce) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('[data-light]');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--lx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--ly', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* --------------------------------------------------------- booking form -- */
  [].forEach.call(document.querySelectorAll('form[data-kp-book]'), function (form) {
    var msg = form.querySelector('.kp-form__msg');
    var submit = form.querySelector('button[type="submit"]');
    var label = submit.textContent;
    var say = function (t) { msg.textContent = t; };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      say('');
      [].forEach.call(form.querySelectorAll('[aria-invalid]'), function (i) { i.removeAttribute('aria-invalid'); });
      if (!form.reportValidity()) return;
      var body = {};
      new FormData(form).forEach(function (v, k) { body[k] = v; });
      body.page = location.pathname;
      submit.disabled = true; submit.textContent = 'Sending';
      fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.ok) {
            (res.j.fields || []).forEach(function (f) { var i = form.elements[f]; if (i) i.setAttribute('aria-invalid', 'true'); });
            say(res.j.error || 'That did not go through. Please call (226) 240-4250.');
            var bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus();
            return;
          }
          var done = document.createElement('div');
          done.className = 'kp-form kp-form__done'; done.setAttribute('role', 'status'); done.tabIndex = -1;
          done.innerHTML = '<svg class="kp-tick" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="25"/><path d="M16 28l8 8 15-17"/></svg>' +
            '<h3>Request received.</h3><p></p><p>Reference <code></code></p><p>If water is running right now, do not wait for a reply. Call <a href="tel:+12262404250">(226) 240-4250</a>.</p>';
          done.querySelectorAll('p')[0].textContent = 'Thanks, ' + res.j.name + '. Your request about "' + res.j.problem.toLowerCase() + '" is logged and the office will ring ' + res.j.phone + '.';
          done.querySelector('code').textContent = res.j.reference;
          form.replaceWith(done); done.focus();
        })
        .catch(function () { say('The booking service is not reachable from here. Please call (226) 240-4250 instead.'); })
        .then(function () { submit.disabled = false; submit.textContent = label; });
    });
  });
})();
