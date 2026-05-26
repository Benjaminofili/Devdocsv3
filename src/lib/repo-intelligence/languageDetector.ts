import type { FileContent } from '../analyze';

/**
 * Detect primary programming language and package manager based on common files.
 */
export function detectLanguageAndPackageManager(files: FileContent[]): {
  language: string;
  packageManager: string;
} {
  const hasPackageJson = files.some(f => f.name === 'package.json');
  const hasRequirements = files.some(f => f.name === 'requirements.txt' || f.name === 'pyproject.toml');
  const hasGoMod = files.some(f => f.name === 'go.mod');
  const hasCargo = files.some(f => f.name === 'Cargo.toml');

  if (hasPackageJson) {
    return { language: 'JavaScript/TypeScript', packageManager: 'npm' };
  }
  if (hasRequirements) {
    return { language: 'Python', packageManager: 'pip' };
  }
  if (hasGoMod) {
    return { language: 'Go', packageManager: 'go' };
  }
  if (hasCargo) {
    return { language: 'Rust', packageManager: 'cargo' };
  }
  return { language: 'unknown', packageManager: 'unknown' };
}
