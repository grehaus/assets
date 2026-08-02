(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ACTIONS = ['glitch', 'collapse', 'matrix'];
  const LABELS  = ['Power cycle', 'Collapse terminal', '???'];

  const MESSAGES = [
    "root access granted.",
    "there's no place like 127.0.0.1",
    "you found the easter egg.",
    "nice — try the other dots too.",
    "sudo ./coffee.sh",
  ];

  function upgradeWindow(win) {
    const dotsWrap = win.querySelector('.win-dots');
    if (!dotsWrap) return;
    const dots = Array.from(dotsWrap.children);
    if (dots.length < 3) return;

    dots.forEach((dot, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'win-dot';
      btn.setAttribute('aria-label', LABELS[i] || '');
      btn.dataset.action = ACTIONS[i] || '';
      dot.replaceWith(btn);
    });

    dotsWrap.querySelectorAll('button.win-dot').forEach(btn => {
      btn.addEventListener('click', () => handleAction(win, btn.dataset.action));
    });
  }

  function handleAction(win, action) {
    if (action === 'collapse') return toggleCollapse(win);
    if (action === 'glitch')   return doGlitch(win);
    if (action === 'matrix')  return doMatrix(win);
  }

  /* ---------- ochre: collapse / expand ---------- */
  function toggleCollapse(win) {
    const body = win.querySelector('.win-body');
    if (!body) { win.classList.toggle('is-collapsed'); return; }

    if (reduceMotion) {
      win.classList.toggle('is-collapsed');
      body.style.maxHeight = win.classList.contains('is-collapsed') ? '0px' : 'none';
      return;
    }

    const collapsing = !win.classList.contains('is-collapsed');

    if (collapsing) {
      // lock in the current real height, then animate down to 0
      body.style.maxHeight = body.scrollHeight + 'px';
      requestAnimationFrame(() => {
        win.classList.add('is-collapsed');
        requestAnimationFrame(() => { body.style.maxHeight = '0px'; });
      });
    } else {
      win.classList.remove('is-collapsed');
      body.style.maxHeight = body.scrollHeight + 'px';
      body.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName !== 'max-height') return;
        body.style.maxHeight = 'none'; // let it grow freely again, no cap
        body.removeEventListener('transitionend', onEnd);
      });
    }
  }

  /* ---------- orange: glitch power-cycle ---------- */
  function doGlitch(win) {
    if (reduceMotion || win.classList.contains('is-glitching')) return;
    win.classList.add('is-glitching');
    win.addEventListener('animationend', () => win.classList.remove('is-glitching'), { once: true });
  }

  /* ---------- green: matrix rain + hidden message ---------- */
  function doMatrix(win) {
    if (win.querySelector('.matrix-overlay')) return; // already running
    const body = win.querySelector('.win-body');
    if (!body) return;

    const overlay = document.createElement('div');
    overlay.className = 'matrix-overlay';
    const canvas = document.createElement('canvas');
    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    overlay.appendChild(canvas);
    overlay.appendChild(msg);
    win.appendChild(overlay);

    if (reduceMotion) {
      overlay.classList.add('active');
      msg.classList.add('show');
      setTimeout(() => overlay.remove(), 1400);
      return;
    }

    requestAnimationFrame(() => overlay.classList.add('active'));

    const ctx = canvas.getContext('2d');
    canvas.width = body.clientWidth || win.clientWidth;
    canvas.height = body.clientHeight || 220;

    const chars = '01ABCDEF{}<>/#$!@*&';
    const fontSize = 13;
    const columns = Math.max(1, Math.floor(canvas.width / fontSize));
    const drops = new Array(columns).fill(1);

    let frame = 0;
    const maxFrames = 85;

    const interval = setInterval(() => {
      ctx.fillStyle = 'rgba(17,19,21,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.94 ? '#ffc857' : '#3ddc84';
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }

      frame++;
      if (frame === Math.floor(maxFrames * 0.55)) msg.classList.add('show');
      if (frame >= maxFrames) {
        clearInterval(interval);
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 350);
      }
    }, 45);
  }

  document.querySelectorAll('.win').forEach(upgradeWindow);
})();
