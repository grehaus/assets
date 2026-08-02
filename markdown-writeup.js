(function () {
  const DIFF_FILL = { easy: 2, medium: 5, hard: 8, insane: 10 };

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function inlineFormat(raw) {
    let s = escapeHTML(raw);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return s;
  }

  function parseFrontmatter(text) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) return { meta: {}, body: text };
    const meta = {};
    m[1].split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      meta[key] = val;
    });
    return { meta, body: m[2] };
  }

  function parseBlocks(body) {
    const lines = body.replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let para = [];
    let inCode = false;
    let codeLines = [];

    function flushPara() {
      if (para.length) {
        blocks.push({ type: 'para', text: para.join(' ').trim() });
        para = [];
      }
    }

    for (const line of lines) {
      if (inCode) {
        if (line.trim() === '```') {
          blocks.push({ type: 'code', lines: codeLines });
          codeLines = [];
          inCode = false;
        } else {
          codeLines.push(line);
        }
        continue;
      }
      if (line.trim().startsWith('```')) {
        flushPara();
        inCode = true;
        continue;
      }
      if (/^##\s+/.test(line)) {
        flushPara();
        blocks.push({ type: 'heading', text: line.replace(/^##\s+/, '').trim() });
        continue;
      }
      if (line.trim() === '') {
        flushPara();
        continue;
      }
      para.push(line.trim());
    }
    flushPara();
    return blocks;
  }

  function renderDiffBar(filled) {
    let out = '';
    for (let i = 0; i < 10; i++) {
      out += i < filled ? '<span class="filled"></span>' : '<span></span>';
    }
    return out;
  }

  function renderInfoCard(meta) {
    const difficulty = (meta.difficulty || 'easy').toLowerCase();
    const filled = DIFF_FILL[difficulty] || 2;
    const tags = (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const word = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    return `
<div class="infocard difficulty-${difficulty}">
  <div class="ic-bar">
    <div class="ic-dots"><span></span><span></span><span></span></div>
    <div class="ic-bar-title">cat ${escapeHTML(meta.title || 'writeup')}.info</div>
  </div>
  <div class="ic-body">
    <span class="ic-source">${escapeHTML(meta.source || '')}</span>
    <p class="ic-title">${escapeHTML(meta.title || '')}</p>
    <dl>
      <div class="ic-row">
        <dt>Difficulty</dt>
        <dd>
          <span class="diff-word">${word}</span>
          <span class="diff-bar" aria-hidden="true">${renderDiffBar(filled)}</span>
        </dd>
      </div>
      <div class="ic-row">
        <dt>Tags</dt>
        <dd class="ic-tags">${tags.map(t => `<span>${escapeHTML(t)}</span>`).join('')}</dd>
      </div>
      <div class="ic-row">
        <dt>Summary</dt>
        <dd class="ic-summary">${inlineFormat(meta.summary || '')}</dd>
      </div>
    </dl>
  </div>
</div>`.trim();
  }

  function renderHeading(text) {
    const m = text.match(/^(\[[^\]]+\])\s*(.*)$/);
    if (m) {
      return `<p class="row"><span class="step-num">${escapeHTML(m[1])}</span> ${inlineFormat(m[2])}</p>`;
    }
    return `<p class="row">${inlineFormat(text)}</p>`;
  }

  function renderCode(lines) {
    let cmd = null;
    let out = lines;
    if (lines.length && /^\$\s?/.test(lines[0])) {
      cmd = lines[0].replace(/^\$\s?/, '');
      out = lines.slice(1);
    }
    let inner = '';
    if (cmd !== null) {
      inner += `<span class="cmd">${escapeHTML(cmd)}</span>`;
      if (out.length) inner += '\n';
    }
    if (out.length) {
      const outHTML = out.map(l => {
        let hl = false;
        if (l.startsWith('!!')) { hl = true; l = l.slice(2); }
        const esc = escapeHTML(l);
        return hl ? `<span class="hl">${esc}</span>` : esc;
      }).join('\n');
      inner += `<span class="out">${outHTML}</span>`;
    }
    return `<div class="code-block"><pre>${inner}</pre></div>`;
  }

  function renderBody(blocks) {
    return blocks.map(b => {
      if (b.type === 'heading') return renderHeading(b.text);
      if (b.type === 'code') return renderCode(b.lines);
      return `<p class="note">${inlineFormat(b.text)}</p>`;
    }).join('\n');
  }

  function init() {
    const infoMount = document.getElementById('infocard-mount');
    const termMount = document.getElementById('term-mount');
    if (!infoMount && !termMount) return; // page doesn't use the renderer

    fetch('./content.md')
      .then(r => {
        if (!r.ok) throw new Error('content.md not found (HTTP ' + r.status + ')');
        return r.text();
      })
      .then(text => {
        const { meta, body } = parseFrontmatter(text);
        const blocks = parseBlocks(body);
        if (infoMount) infoMount.innerHTML = renderInfoCard(meta);
        if (termMount) termMount.innerHTML = renderBody(blocks);
      })
      .catch(err => {
        console.error('[markdown-writeup]', err);
        if (termMount) {
          termMount.innerHTML = `<p class="row out dim">Couldn't load content.md — ${escapeHTML(err.message)}.
Note: opening index.html directly (file://) blocks this fetch in most browsers.
Serve it locally instead, e.g.: <span class="prompt">python3 -m http.server</span></p>`;
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
