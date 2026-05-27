import type { GenerateMasterRequest, RepoProfile, MinifiedPackageJson } from '../../validators/schemas.js';
import { SECTION_BRICKS } from '../../bricks/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MasterPromptResult {
  system: string;
  user: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (Crash-proofed)
// ─────────────────────────────────────────────────────────────────────────────

function formatPackageJson(pkg: any): string {
  if (!pkg) return '';
  const lines: string[] = [];

  if (pkg.name)        lines.push(`name: ${pkg.name}`);
  if (pkg.description) lines.push(`description: ${pkg.description}`);
  if (pkg.version)     lines.push(`version: ${pkg.version}`);

  if (pkg.scripts && Object.keys(pkg.scripts).length) {
    lines.push('\nscripts:');
    Object.entries(pkg.scripts).forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
  }

  if (pkg.dependencies && Object.keys(pkg.dependencies).length) {
    lines.push('\ndependencies:');
    Object.keys(pkg.dependencies).forEach(k => lines.push(`  ${k}`));
  }

  if (pkg.devDependencies && Object.keys(pkg.devDependencies).length) {
    lines.push('\ndevDependencies:');
    Object.keys(pkg.devDependencies).forEach(k => lines.push(`  ${k}`));
  }

  return lines.join('\n');
}

function formatRepoProfile(profile: any): string {
  if (!profile) return '';
  const lines: string[] = [];

  if (profile.architecture) {
    lines.push(`Architecture: ${profile.architecture}`);
  }

  if (profile.frameworks?.length) {
    lines.push(`Frameworks: ${profile.frameworks.join(', ')}`);
  }

  if (profile.languages && typeof profile.languages === 'object') {
    const langs = Object.entries(profile.languages)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([lang]) => lang)
      .join(', ');
    if (langs) lines.push(`Primary Languages: ${langs}`);
  }

  // ✅ FIX: Handle features as an OBJECT, not an array
  if (profile.features && typeof profile.features === 'object') {
    const activeFeatures = Object.entries(profile.features)
      .filter(([, v]) => v === true)
      .map(([k]) => k.replace('has', ''))
      .join(', ');
    if (activeFeatures) lines.push(`Confirmed Features: ${activeFeatures}`);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompt  (role + absolute rules)
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are an elite technical writer specialising in open-source software documentation.
Your sole task is to produce a single, cohesive README.md in valid GitHub-flavoured Markdown.

ABSOLUTE RULES — violating any of these is a critical failure:
1. Write ONLY the sections listed in the BLUEPRINT, in the exact order given.
   Do not add extra sections, headings, or commentary outside those sections.
2. Do not output anything other than the Markdown document itself.
   No preamble ("Here is your README…"), no apology, no explanation after the document.
3. Every section must flow naturally into the next. The document must read as if
   written by a single senior engineer in one sitting, not assembled from fragments.
4. Use real badge URLs where appropriate (shields.io). Never invent fake URLs for
   code examples, API endpoints, or external services not mentioned in the context.
5. The very first heading (H1) of the document MUST be the exact Project Name provided in the metadata (e.g., "# SwiftAid"). NEVER use the section title (like "# Project Header") as the H1.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// User prompt builder (Crash-proofed)
// ─────────────────────────────────────────────────────────────────────────────

export function buildMasterPrompt(req: GenerateMasterRequest): MasterPromptResult {
  const {
    projectName,
    repoUrl,
    selectedSectionIds,
    stack,
    repoProfile,
    packageJson,
    envExample,
    contextFiles,
    fallbackStrategy,
  } = req;

  const parts: string[] = [];

  // ── 1. Project identity ───────────────────────────────────────────────────
  parts.push(`=== PROJECT ===`);
  parts.push(`Name: ${projectName}`);
  if (repoUrl) parts.push(`Repository: ${repoUrl}`);
  parts.push(
    `Stack: ${stack.primary} | Language: ${stack.language} | Package manager: ${stack.packageManager}`,
  );

  const flags = [
    stack.hasDocker   && 'Docker',
    stack.hasCI       && 'CI/CD',
    stack.hasTesting  && 'Tests',
    stack.hasEnvFile  && 'Environment file (.env)',
  ].filter(Boolean);
  if (flags.length) parts.push(`Infrastructure: ${flags.join(', ')}`);

  if (stack.frameworks?.length) {
    parts.push(`Frameworks / libraries: ${stack.frameworks.join(', ')}`);
  }

  if (stack.domainHints?.length) {
    parts.push(`Domain hints: ${stack.domainHints.join(', ')}`);
  }

  // ── 2. Package.json ───────────────────────────────────────────────────────
  if (packageJson) {
    parts.push(`\n=== PACKAGE.JSON (minified) ===`);
    parts.push(formatPackageJson(packageJson));
  }

  // ── 3. Repo profile  (semantic analysis) ─────────────────────────────────
  if (repoProfile) {
    parts.push(`\n=== REPO PROFILE ===`);
    parts.push(formatRepoProfile(repoProfile));
  }

  // ── 4. Environment variables ──────────────────────────────────────────────
  if (envExample) {
    parts.push(`\n=== .ENV.EXAMPLE ===`);
    const envLines = envExample.split('\n').slice(0, 50).join('\n');
    parts.push(envLines);
  }

  // ── 5. Context files ──────────────────────────────────────────────────────
  if (contextFiles?.length) {
    parts.push(`\n=== CONTEXT FILES ===`);
    contextFiles.forEach(f => {
      parts.push(`\n--- ${f.name} ---`);
      parts.push(f.content.slice(0, 8_000));
    });
  }

  // ── 6. Blueprint (the ordered section list) ───────────────────────────────
  parts.push(`\n=== BLUEPRINT ===`);
  parts.push(
    `Write the following sections in this exact order. ` +
    `${fallbackStrategy === 'skip'
      ? 'If a section has no supporting data, omit it entirely.'
      : 'If a section has no supporting data, write a concise best-practice placeholder for the detected stack.'
    }`,
  );
  parts.push('');

  selectedSectionIds.forEach((id, i) => {
    const brick = SECTION_BRICKS.find(b => b.id === id);
    if (brick) {
      parts.push(
        `${i + 1}. ${brick.name}${brick.description ? ` — ${brick.description}` : ''}`,
      );
    } else {
      parts.push(`${i + 1}. ${id}`);
    }
  });

  parts.push('\nNow write the README:');

  return {
    system: SYSTEM_PROMPT,
    user: parts.join('\n'),
  };
}
