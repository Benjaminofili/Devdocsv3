import type { FileContent } from '../../analyze';
import type { RepoProfile } from './types';

/**
 * Build a prompt context from high‑value files while respecting a token budget.
 * For simplicity we approximate 1 token ≈ 4 characters.
 */
export function buildContext(
  contextFiles: { name: string; content: string }[],
  maxTokens: number = 8000
): string {
  const maxChars = maxTokens * 4;
  const parts: string[] = [];
  let used = 0;
  for (const file of contextFiles) {
    const header = `--- ${file.name} ---\n`;
    const content = file.content;
    const segment = header + content + '\n';
    if (used + segment.length > maxChars) {
      // truncate the last file to fit
      const remaining = maxChars - used;
      if (remaining > 0) {
        parts.push(segment.slice(0, remaining));
      }
      break;
    }
    parts.push(segment);
    used += segment.length;
  }
  return parts.join('');
}
