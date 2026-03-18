const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const CSV_PATH = path.join(__dirname, 'refactored_code.csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }

      value += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      row.push(value);
      value = '';
      i += 1;
      continue;
    }

    if (ch === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      i += 1;
      continue;
    }

    if (ch === '\r') {
      i += 1;
      continue;
    }

    value += ch;
    i += 1;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0];
  return rows.slice(1).map((record) => {
    const out = {};
    for (let j = 0; j < header.length; j += 1) {
      out[header[j]] = record[j] ?? '';
    }
    return out;
  });
}

function isWordBoundary(str, index) {
  if (index < 0 || index >= str.length) {
    return true;
  }
  return !/[A-Za-z0-9_$]/.test(str[index]);
}

function inferFunctionName(source, functionStart, functionSource) {
  const explicit = /^function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(functionSource);
  if (explicit && explicit[1]) {
    return explicit[1];
  }

  const prefix = source.slice(Math.max(0, functionStart - 120), functionStart);
  const assignName = /([A-Za-z_$][\w$]*)\s*=\s*$/.exec(prefix);
  if (assignName && assignName[1]) {
    return assignName[1];
  }

  const keyName = /([A-Za-z_$][\w$]*)\s*:\s*$/.exec(prefix);
  if (keyName && keyName[1]) {
    return keyName[1];
  }

  return 'anonymous';
}

function readStringLiteral(source, start, quote) {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === quote) {
      return i + 1;
    }
    i += 1;
  }
  return source.length;
}

function readTemplateLiteral(source, start) {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '`') {
      return i + 1;
    }
    if (ch === '$' && source[i + 1] === '{') {
      i = readBalancedBlock(source, i + 1, '{', '}');
      continue;
    }
    i += 1;
  }
  return source.length;
}

function readComment(source, start) {
  if (source[start + 1] === '/') {
    let i = start + 2;
    while (i < source.length && source[i] !== '\n') {
      i += 1;
    }
    return i;
  }

  if (source[start + 1] === '*') {
    let i = start + 2;
    while (i < source.length - 1) {
      if (source[i] === '*' && source[i + 1] === '/') {
        return i + 2;
      }
      i += 1;
    }
    return source.length;
  }

  return start + 1;
}

function readBalancedBlock(source, start, openChar, closeChar) {
  let depth = 0;
  let i = start;

  while (i < source.length) {
    const ch = source[i];

    if (ch === openChar) {
      depth += 1;
      i += 1;
      continue;
    }

    if (ch === closeChar) {
      depth -= 1;
      i += 1;
      if (depth === 0) {
        return i;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      i = readStringLiteral(source, i, ch);
      continue;
    }

    if (ch === '`') {
      i = readTemplateLiteral(source, i);
      continue;
    }

    if (ch === '/') {
      i = readComment(source, i);
      continue;
    }

    i += 1;
  }

  return source.length;
}

function extractFunctions(source) {
  const functions = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === '"' || ch === "'") {
      i = readStringLiteral(source, i, ch);
      continue;
    }

    if (ch === '`') {
      i = readTemplateLiteral(source, i);
      continue;
    }

    if (ch === '/') {
      i = readComment(source, i);
      continue;
    }

    const maybeFunction = source.slice(i, i + 8);
    if (
      maybeFunction === 'function' &&
      isWordBoundary(source, i - 1) &&
      isWordBoundary(source, i + 8)
    ) {
      let cursor = i + 8;
      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1;
      }

      if (/[A-Za-z_$]/.test(source[cursor])) {
        cursor += 1;
        while (cursor < source.length && /[\w$]/.test(source[cursor])) {
          cursor += 1;
        }
      }

      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1;
      }

      if (source[cursor] !== '(') {
        i += 8;
        continue;
      }

      cursor = readBalancedBlock(source, cursor, '(', ')');
      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1;
      }

      if (source[cursor] !== '{') {
        i += 8;
        continue;
      }

      const end = readBalancedBlock(source, cursor, '{', '}');
      const functionSource = source.slice(i, end);
      const name = inferFunctionName(source, i, functionSource);
      functions.push({ name, source: functionSource });
      i = end;
      continue;
    }

    i += 1;
  }

  return functions;
}

function loadFunctionEntries() {
  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parseCsv(text);
  const entries = [];

  records.forEach((record, rowIndex) => {
    const source = record.method_definition || '';
    const funcs = extractFunctions(source);
    funcs.forEach((fn, functionIndex) => {
      entries.push({
        rowIndex: rowIndex + 2,
        functionIndex,
        name: fn.name,
        source: fn.source,
      });
    });
  });

  return entries;
}

test('method_definition contains extractable functions', () => {
  const entries = loadFunctionEntries();
  assert.ok(entries.length > 0, 'No functions were extracted from method_definition');
});

test('all extracted functions are syntactically valid', () => {
  const entries = loadFunctionEntries();
  const failures = [];

  for (const entry of entries) {
    try {
      const compilation = new vm.Script(`(${entry.source})`, { displayErrors: true });
      const fn = compilation.runInNewContext({}, { timeout: 100 });
      if (typeof fn !== 'function') {
        failures.push(
          `row ${entry.rowIndex} function ${entry.functionIndex + 1} (${entry.name}): extracted source does not evaluate to a function`
        );
      }
    } catch (error) {
      const msg = error && error.message ? error.message : String(error);
      failures.push(`row ${entry.rowIndex} function ${entry.functionIndex + 1} (${entry.name}): ${msg}`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `Function test failures (${failures.length}):\n${failures.slice(0, 50).join('\n')}`
  );
});
