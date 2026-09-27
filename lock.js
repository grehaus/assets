(function () {
  const gate = document.getElementById('lock-screen');
  if (!gate) return; // not a protected page, do nothing

  const form = document.getElementById('lock-form');
  const input = document.getElementById('wu-password');
  const submitBtn = document.getElementById('lock-submit');
  const errorEl = document.getElementById('lock-error');
  const unlockedWrap = document.getElementById('unlocked-content');
  const infoMount = document.getElementById('protected-infocard-mount');
  const termMount = document.getElementById('protected-term-mount');

  const PBKDF2_ITERATIONS = 250000;

  function b64ToBytes(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }

  async function deriveKey(password, saltBytes) {
    const baseKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  async function attemptUnlock(password) {
    const res = await fetch('./content.enc');
    if (!res.ok) throw new Error('content.enc not found (HTTP ' + res.status + ')');
    const payload = await res.json();

    const salt = b64ToBytes(payload.salt);
    const iv = b64ToBytes(payload.iv);
    const data = b64ToBytes(payload.data);

    const key = await deriveKey(password, salt);
    // Throws if the password is wrong — AES-GCM's auth tag fails to verify.
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(plainBuf);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value;
    if (!password) return;

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'decrypting…';

    try {
      const markdown = await attemptUnlock(password);
      const { meta, body } = window.WriteupRenderer.parseFrontmatter(markdown);
      const blocks = window.WriteupRenderer.parseBlocks(body);

      if (infoMount) infoMount.innerHTML = window.WriteupRenderer.renderInfoCard(meta);
      if (termMount) termMount.innerHTML = window.WriteupRenderer.renderBody(blocks);
      if (termMount && window.Prism) window.Prism.highlightAllUnder(termMount);

      gate.remove();
      unlockedWrap.hidden = false;

      // re-run the terminal-dot easter eggs on the newly revealed .win element(s)
      if (window.reinitWinDots) window.reinitWinDots(unlockedWrap);
    } catch (err) {
      errorEl.textContent = 'Access denied.';
      input.value = '';
      input.focus();
      submitBtn.disabled = false;
      submitBtn.textContent = './unlock';
    }
  });
})();
