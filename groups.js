(function () {
  const ORDER = ['easy', 'medium', 'hard', 'insane'];
  const LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard', insane: 'Insane' };
  const FILL = { easy: 2, medium: 5, hard: 8, insane: 10 };

  const OPEN_FIRST_GROUP = true;

  function difficultyOf(row) {
    return ORDER.find(d => row.classList.contains('difficulty-' + d)) || null;
  }

  function barHTML(n) {
    let out = '';
    for (let i = 0; i < 10; i++) out += i < n ? '<span class="filled"></span>' : '<span></span>';
    return out;
  }

  function setOpen(section, open) {
    section.classList.toggle('open', open);
    section.querySelector('.dgroup-head').setAttribute('aria-expanded', String(open));
  }

  function groupPanel(panel, panelIndex) {
    if (panel.dataset.grouped) return;              // never group twice
    const rows = Array.from(panel.children).filter(el => el.matches('a.entry-link'));
    if (!rows.length) return;                       // "No write-ups yet" panels stay as they are
    panel.dataset.grouped = '1';

    const buckets = {};
    ORDER.forEach(d => { buckets[d] = []; });
    const ungrouped = [];
    rows.forEach(r => { const d = difficultyOf(r); (d ? buckets[d] : ungrouped).push(r); });

    const frag = document.createDocumentFragment();
    let first = null;

    ORDER.forEach(d => {
      const list = buckets[d];
      if (!list.length) return;                     // no empty headers
      const id = `dg-${panelIndex}-${d}`;

      const section = document.createElement('section');
      section.className = `dgroup difficulty-${d}`;

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'dgroup-head';
      head.id = id + '-head';
      head.setAttribute('aria-expanded', 'false');
      head.setAttribute('aria-controls', id);
      head.innerHTML =
        '<span class="dgroup-chevron" aria-hidden="true">›</span>' +
        `<span class="dgroup-name">${LABELS[d]}</span>` +
        `<span class="entry-bar dgroup-bar" aria-hidden="true">${barHTML(FILL[d])}</span>` +
        `<span class="dgroup-count">${list.length}</span>`;
      head.addEventListener('click', () => setOpen(section, !section.classList.contains('open')));

      const body = document.createElement('div');
      body.className = 'dgroup-body';
      body.id = id;
      body.setAttribute('role', 'region');
      body.setAttribute('aria-labelledby', head.id);
      const inner = document.createElement('div');
      inner.className = 'dgroup-inner';
      list.forEach((row, i) => { row.style.setProperty('--i', i); inner.appendChild(row); });
      body.appendChild(inner);

      section.appendChild(head);
      section.appendChild(body);
      frag.appendChild(section);
      if (!first) first = section;
    });

    // anything without a recognised difficulty stays visible, after the groups
    ungrouped.forEach(r => frag.appendChild(r));
    panel.appendChild(frag);

    if (OPEN_FIRST_GROUP && first) {
      requestAnimationFrame(() => requestAnimationFrame(() => setOpen(first, true)));
    }
  }

  function init() {
    document.querySelectorAll('.cat-panel').forEach((p, i) => groupPanel(p, i));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
