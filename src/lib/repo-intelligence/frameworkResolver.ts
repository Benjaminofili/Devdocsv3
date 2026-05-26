import type { FileContent } from '../analyze';

/**
 * Resolve frameworks based on detected language and dependencies.
 */
export function resolveFrameworks(language: string, files: FileContent[]): string[] {
  const frameworks: Set<string> = new Set();
  const contentMap = new Map(files.map(f => [f.name, f.content]));

  if (language.includes('JavaScript')) {
    const pkgJson = contentMap.get('package.json');
    if (pkgJson) {
      try {
        const pkg = JSON.parse(pkgJson);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['next']) frameworks.add('Next.js');
        if (deps['react']) frameworks.add('React');
        if (deps['vue']) frameworks.add('Vue.js');
        if (deps['@angular/core']) frameworks.add('Angular');
        if (deps['express']) frameworks.add('Express');
        if (deps['@nestjs/core']) frameworks.add('NestJS');
        if (deps['tailwindcss']) frameworks.add('Tailwind CSS');
        if (deps['prisma']) frameworks.add('Prisma');
        if (deps['mongoose']) frameworks.add('Mongoose');
      } catch (e) {
        // ignore parse errors
      }
    }
  }

  if (language === 'Python') {
    const req = contentMap.get('requirements.txt') || '';
    if (req.includes('django')) frameworks.add('Django');
    if (req.includes('flask')) frameworks.add('Flask');
    if (req.includes('fastapi')) frameworks.add('FastAPI');
  }

  if (language === 'Go') {
    const goMod = contentMap.get('go.mod') || '';
    if (goMod.includes('gin-gonic')) frameworks.add('Gin');
    if (goMod.includes('echo')) frameworks.add('Echo');
    if (goMod.includes('fiber')) frameworks.add('Fiber');
  }

  if (language === 'Rust') {
    const cargo = contentMap.get('Cargo.toml') || '';
    if (cargo.includes('actix-web')) frameworks.add('Actix Web');
    if (cargo.includes('axum')) frameworks.add('Axum');
  }

  return Array.from(frameworks);
}
