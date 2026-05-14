export function minifyContext(code: string, fileName: string): string {
  if (fileName.endsWith('.json')) {
    try { return JSON.stringify(JSON.parse(code)); } catch { return code.substring(0, 1500); }
  }
  return code
    .replace(/#.*$/gm, '') // Remove Python comments
    .replace(/\/\/.*$/gm, '') // Remove JS/TS single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove JS/TS block comments
    .replace(/^\s*[\r\n]/gm, '') // Remove empty lines
    .substring(0, 1500); // Strict 1500 character token cap
}
