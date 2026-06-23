// Pure subtitle parsing + alignment. No DOM, no deps — shared by index.html and test.mjs.

export function toMs(t) {
  t = t.trim().replace(',', '.');
  const parts = t.split(':').map(Number);
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  else if (parts.length === 2) [m, s] = parts;
  else s = parts[0];
  return Math.round((h * 3600 + m * 60 + s) * 1000);
}

const TIME = /(\d{1,2}:\d{1,2}:\d{1,2}[.,]\d{1,3}|\d{1,2}:\d{1,2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{1,2}:\d{1,2}[.,]\d{1,3}|\d{1,2}:\d{1,2}[.,]\d{1,3})/;

// Strip ASS override tags ({\...}), turn \N/\n into newlines, \h into space.
function cleanAss(s) {
  return s.replace(/\{[^}]*\}/g, '').replace(/\\N|\\n/gi, '\n').replace(/\\h/g, ' ').trim();
}

// Parse Advanced SubStation Alpha. Text is always the last column per spec, so it may contain commas.
function parseAss(text) {
  const cues = [];
  let inEvents = false, cols = null;
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (/^\[.*\]$/.test(line)) { inEvents = /^\[events\]$/i.test(line); continue; }
    if (!inEvents) continue;
    if (/^Format:/i.test(line)) { cols = line.slice(line.indexOf(':') + 1).split(',').map(s => s.trim().toLowerCase()); continue; }
    if (/^Dialogue:/i.test(line) && cols) {
      const parts = line.slice(line.indexOf(':') + 1).split(',');
      const vals = parts.slice(0, cols.length - 1).map(s => s.trim()).concat(parts.slice(cols.length - 1).join(','));
      const txt = cleanAss(vals[cols.indexOf('text')]);
      if (txt) cues.push({ start: toMs(vals[cols.indexOf('start')]), end: toMs(vals[cols.indexOf('end')]), text: txt });
    }
  }
  return cues.sort((a, b) => a.start - b.start);
}

// Parse SRT, WebVTT, or ASS into [{start,end,text}] sorted by start.
export function parseSubs(text) {
  if (/\bDialogue:/i.test(text) || /^\s*\[Script Info\]/im.test(text)) return parseAss(text);
  text = text.replace(/\r/g, '');
  const cues = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split('\n');
    const tIdx = lines.findIndex(l => TIME.test(l));
    if (tIdx === -1) continue;
    const m = lines[tIdx].match(TIME);
    const txt = lines.slice(tIdx + 1).join('\n').trim();
    if (!txt) continue;
    cues.push({ start: toMs(m[1]), end: toMs(m[2]), text: txt });
  }
  return cues.sort((a, b) => a.start - b.start);
}

// Cards are driven off track A; overlapping text from track B becomes the back.
// Time-overlap handles both perfectly-aligned dual subs and loosely-timed ones.
export function buildCards(a, b) {
  return a.map((cue, i) => {
    const back = b.filter(x => x.start < cue.end && x.end > cue.start)
                  .map(x => x.text).join(' ');
    return { i, start: cue.start, end: cue.end, front: cue.text, back, include: true };
  });
}
