export function parseLegacyJson<T>(contents: string): T {
  const input = contents.replace(/^\uFEFF/, '');
  let output = '';
  let inString = false;
  let escaped = false;

  for (const character of input) {
    if (!inString) {
      output += character;
      if (character === '"') inString = true;
      continue;
    }

    if (escaped) {
      output += character;
      escaped = false;
    } else if (character === '\\') {
      output += character;
      escaped = true;
    } else if (character === '"') {
      output += character;
      inString = false;
    } else {
      const code = character.charCodeAt(0);
      if (code < 0x20) {
        if (character === '\n') output += '\\n';
        else if (character === '\r') output += '\\r';
        else if (character === '\t') output += '\\t';
        else output += `\\u${code.toString(16).padStart(4, '0')}`;
      } else {
        output += character;
      }
    }
  }

  return JSON.parse(output) as T;
}
