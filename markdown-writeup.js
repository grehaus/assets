/* ============================================================
   grehaus.github.io — markdown write-up renderer
   Fetches ./content.md (next to whatever page this script runs on),
   parses it, and fills in #infocard-mount and #term-mount.

   content.md format:

     ---
     source: Hack The Box
     title: Lab01
     difficulty: medium        (easy | medium | hard | insane)
     tags: SMB, Web Exploitation, Active Directory
     summary: **Lab01:** short summary here, `code` and **bold** work.
     ---

     ## [01] Step label
     ```term
     $ command goes here
     plain output line
     !!this line gets highlighted acid-green — the !! is stripped
     ??this line gets highlighted turquoise — a second, distinct tier
     ```

     A paragraph of narrative text between steps. `code` and **bold**
     work here too. Can be written across multiple source lines freely.

     > A blockquote/callout — renders as a distinct tinted box with a
     > colored left border. Good for asides, gotchas, or "here's an
     > article that helped me" notes. Consecutive `>` lines join into
     > one callout; a blank line ends it.

     - A bullet list item
     - Another item
       (list ends at the first blank line or non "- " line)

     ![alt text](path/to/image.png)
     (a line that is ONLY an image tag becomes its own full-width
     figure; ![alt](src) written mid-sentence in a paragraph instead
     renders inline)

     ## [02] Next step
     ...

   Notes:
   - A ```term block whose first line does NOT start with "$ " is
     rendered as plain output only (no command line) — use this for
     pasting raw code/config files, not just command+output pairs.
   - Everything inside ```term blocks and paragraphs is HTML-escaped
     automatically. Never worry about <, >, & again.
   ============================================================ */
(function () {
  const DIFF_FILL = { easy: 2, medium: 5, hard: 8, insane: 10 };

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

  function inlineFormat(raw) {
    let s = escapeHTML(raw);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // inline image, e.g. mid-sentence: ![alt](path.png)
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="wu-inline-img" src="$2" alt="$1">');
    return s;
  }

  function parseFrontmatter(text) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) return { meta: {}, body: text };
    const meta = {};
    let lastKey = null;
    m[1].split('\n').forEach(rawLine => {
      const line = rawLine.trim();
      if (line === '') return;
      // a "new key" line looks like: word[-word]*:  followed by a space and value
      const keyMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]{0,24}):\s?(.*)$/);
      if (keyMatch) {
        const key = keyMatch[1];
        meta[key] = keyMatch[2];
        lastKey = key;
      } else if (lastKey) {
        // continuation of the previous field's value, wrapped onto a new line
        meta[lastKey] += ' ' + line;
      }
    });
    return { meta, body: m[2] };
  }

  function parseBlocks(body) {
    const lines = body.replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let inCode = false;
    let codeLines = [];

    // mode tracks which multi-line block we're currently accumulating:
    // null | 'para' | 'quote' | 'list'
    let mode = null;
    let paraBuf = [];
    let quoteBuf = [];
    let listBuf = [];

    function flush() {
      if (mode === 'para' && paraBuf.length) {
        blocks.push({ type: 'para', text: paraBuf.join(' ').trim() });
      } else if (mode === 'quote' && quoteBuf.length) {
        blocks.push({ type: 'quote', text: quoteBuf.join(' ').trim() });
      } else if (mode === 'list' && listBuf.length) {
        blocks.push({ type: 'list', items: listBuf.slice() });
      }
      paraBuf = []; quoteBuf = []; listBuf = []; mode = null;
    }

    for (const rawLine of lines) {
      if (inCode) {
        if (rawLine.trim() === '```') {
          blocks.push({ type: 'code', lines: codeLines });
          codeLines = [];
          inCode = false;
        } else {
          codeLines.push(rawLine);
        }
        continue;
      }

      const line = rawLine.trim();

      if (line.startsWith('```')) {
        flush();
        inCode = true;
        continue;
      }
      if (/^##\s+/.test(line)) {
        flush();
        blocks.push({ type: 'heading', text: line.replace(/^##\s+/, '').trim() });
        continue;
      }
      if (line === '') {
        flush();
        continue;
      }
      const imgMatch = line.match(IMAGE_RE);
      if (imgMatch) {
        flush();
        blocks.push({ type: 'image', alt: imgMatch[1], src: imgMatch[2] });
        continue;
      }
      if (line.startsWith('>')) {
        const content = line.replace(/^>\s?/, '');
        if (mode !== 'quote') { flush(); mode = 'quote'; }
        quoteBuf.push(content);
        continue;
      }
      if (/^[-*]\s+/.test(line)) {
        const content = line.replace(/^[-*]\s+/, '');
        if (mode !== 'list') { flush(); mode = 'list'; }
        listBuf.push(content);
        continue;
      }
      if (mode !== 'para') { flush(); mode = 'para'; }
      paraBuf.push(line);
    }
    flush();
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
    const title = escapeHTML(meta.title || 'writeup');

    return `
<div class="infocard difficulty-${difficulty}">
  <div class="ic-bar">
    <div class="ic-dots"><span></span><span></span><span></span></div>
    <div class="ic-bar-title">${title}.info</div>
  </div>
  <div class="ic-body">
    <div class="ic-header">
      <span class="ic-source">${escapeHTML(meta.source || '')}</span>
      <p class="ic-title">${title}</p>
      ${meta.os ? `<p class="ic-os">${escapeHTML(meta.os)}</p>` : ''}
      <p class="ic-diff"><span class="diff-word">${word}</span><span class="diff-blocks" aria-hidden="true">${renderDiffBar(filled)}</span></p>
      ${meta.released ? `<p class="ic-released">Released: ${escapeHTML(meta.released)}</p>` : ''}
    </div>
    <hr class="ic-rule">
    <div class="ic-section">
      <h3>Summary</h3>
      <p class="ic-summary">${inlineFormat(meta.summary || '')}</p>
    </div>
    <hr class="ic-rule">
    <div class="ic-section">
      <h3>Skills</h3>
      <p class="ic-skills">${tags.map(t => escapeHTML(t)).join(' <span class="dot-sep">•</span> ')}</p>
    </div>
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
        let cls = null;
        if (l.startsWith('!!')) { cls = 'hl'; l = l.slice(2); }
        else if (l.startsWith('??')) { cls = 'hl2'; l = l.slice(2); }
        const esc = escapeHTML(l);
        return cls ? `<span class="${cls}">${esc}</span>` : esc;
      }).join('\n');
      inner += `<span class="out">${outHTML}</span>`;
    }
    return `<div class="code-block"><pre>${inner}</pre></div>`;
  }

  function renderQuote(text) {
    return `<blockquote class="wu-quote">${inlineFormat(text)}</blockquote>`;
  }

  function renderList(items) {
    const li = items.map(i => `<li>${inlineFormat(i)}</li>`).join('');
    return `<ul class="wu-list">${li}</ul>`;
  }

  function renderImage(alt, src) {
    const safeSrc = escapeHTML(src);
    const safeAlt = escapeHTML(alt);
    const caption = alt ? `<figcaption>${inlineFormat(alt)}</figcaption>` : '';
    return `<figure class="wu-image"><img src="${safeSrc}" alt="${safeAlt}">${caption}</figure>`;
  }

  function renderBody(blocks) {
    return blocks.map(b => {
      if (b.type === 'heading') return renderHeading(b.text);
      if (b.type === 'code') return renderCode(b.lines);
      if (b.type === 'quote') return renderQuote(b.text);
      if (b.type === 'list') return renderList(b.items);
      if (b.type === 'image') return renderImage(b.alt, b.src);
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
