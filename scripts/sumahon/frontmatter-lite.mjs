// X投稿生成CLIで必要な範囲だけを読む軽量frontmatter parser。
// scalar と複数行リスト（tags / related など）に対応する。
export function extractFrontmatter(raw) {
  const m = String(raw).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: String(raw) };
  const fmText = m[1];
  const body = m[2];
  const fm = {};
  const lines = fmText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listStart = line.match(/^([a-zA-Z_][\w]*)\s*:\s*$/);
    if (listStart) {
      const values = [];
      while (i + 1 < lines.length) {
        const item = lines[i + 1].match(/^\s+-\s+(.+)$/);
        if (!item) break;
        let value = item[1].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        values.push(value);
        i++;
      }
      if (values.length > 0) fm[listStart[1]] = values;
      continue;
    }
    const kv = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.+)$/);
    if (!kv) continue;
    const [, key, valRaw] = kv;
    let val = valRaw.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  return { fm, body };
}
