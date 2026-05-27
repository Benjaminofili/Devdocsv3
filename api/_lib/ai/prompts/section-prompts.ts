import { DetectedStack, SectionConfig } from '../../types.js';
import { logger } from '../../logger.js';

interface GitHubInfo {
  owner: string;
  repo: string;
}

function extractGitHubInfo(repoUrl?: string): GitHubInfo | null {
  if (!repoUrl) return null;
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2].replace('.git', '') };
  }
  return null;
}

export function generateSectionPrompt(
  section:            SectionConfig,
  stack:              DetectedStack,
  projectName:        string,
  additionalContext?: string,
  repoUrl?:           string,
  repoProfile?:       any,
): string {
  const githubInfo = extractGitHubInfo(repoUrl);

  const fallbackName = githubInfo?.repo
    ? githubInfo.repo.charAt(0).toUpperCase() + githubInfo.repo.slice(1)
    : 'Project';
  const safeProjectName =
    typeof projectName === 'string' &&
    projectName.trim() &&
    projectName !== 'Project'
      ? projectName
      : fallbackName;

  // ── Stack-aware command inference ─────────────────────────────────────────
  const isFlutter = stack.primary?.toLowerCase().includes('flutter') ||
                    stack.language?.toLowerCase() === 'dart';
  const isPython  = stack.language?.toLowerCase() === 'python';
  const pkgMgr    = stack.packageManager || 'npm';

  // Read actual scripts from package.json — never guess
  const pkgScripts: Record<string, string> =
    (stack as any).packageJson?.scripts ?? {};

  const installCmd = isFlutter
    ? 'flutter pub get'
    : isPython
      ? 'pip install -r requirements.txt'
      : `${pkgMgr} install`;

  const devCmd = isFlutter
    ? 'flutter run'
    : isPython
      ? 'python app.py'
      : pkgScripts.dev ?? pkgScripts.start ?? `${pkgMgr} run dev`;

  const testCmd = isFlutter
    ? 'flutter test'
    : isPython
      ? 'python -m pytest'
      : pkgScripts.test ?? `${pkgMgr} test`;

  const buildCmd = isFlutter
    ? 'flutter build apk --release'
    : isPython
      ? '# No build step required'
      : pkgScripts.build ?? `${pkgMgr} run build`;

  // ── Badges ─────────────────────────────────────────────────────────────────
  const badgeMarkdown = githubInfo
    ? [
        `![License](https://img.shields.io/github/license/${githubInfo.owner}/${githubInfo.repo})`,
        `![Stars](https://img.shields.io/github/stars/${githubInfo.owner}/${githubInfo.repo}?style=social)`,
        `![Issues](https://img.shields.io/github/issues/${githubInfo.owner}/${githubInfo.repo})`,
      ].join('\n')
    : `![License](https://img.shields.io/badge/license-MIT-blue.svg)`;

  // ── Context files block ────────────────────────────────────────────────────
  let contextFilesStr = '';
  if (stack.contextFiles && stack.contextFiles.length > 0) {
    contextFilesStr =
      '\n=== CRITICAL SOURCE CODE CONTEXT ===\n' +
      'You MUST base your answer strictly on the following repository files:\n\n';
    for (const file of stack.contextFiles) {
      contextFilesStr +=
        `--- START ${file.name} ---\n${file.content}\n--- END ${file.name} ---\n\n`;
    }
  }

  // ── RepoProfile feature constraints ───────────────────────────────────────
  let featureConstraints = '';
  if (repoProfile?.features) {
    const present = Object.entries(repoProfile.features)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k.replace('has', '').toLowerCase())
      .join(', ');
    featureConstraints =
      '\n=== STRICT FEATURE CONSTRAINTS ===\n' +
      `The repository has ONLY the following confirmed features: ${present || 'none'}.\n` +
      'DO NOT write about, imply, or mention any feature not in this list.\n';
  }

  // ── Hardened critical directive ────────────────────────────────────────────
  const criticalDirective = `### CRITICAL SYSTEM DIRECTIVE ###
You are a strict, literal technical writer. Follow every rule below without exception.

1. TRUST THE PACKAGE.JSON
   Only list dependencies, devDependencies, and scripts that are EXPLICITLY present
   in the provided package.json context. Never invent entries.

2. NO HALLUCINATIONS
   Do NOT invent tools, frameworks, libraries, environment variables, or API routes
   that do not appear in the provided source-code context.

3. NO CRA / FRAMEWORK BIAS
   Do NOT assume Create React App, Next.js, or any other framework.
   Check the actual dependencies. If it uses Vite, say Vite. If it uses Next.js,
   say Next.js. NEVER mention react-scripts, npm start, or eject unless those
   exact strings appear in the scripts field of package.json.

4. NO APOLOGETIC FILLER
   If a feature, config file, or section is missing from the context, DO NOT write
   explanatory paragraphs about its absence. DO NOT write:
   - "There is no explicit mention of..."
   - "Since there is no .env.example..."
   - "Note: this project does not appear to have..."
   - "The license for this project is not explicitly stated..."
   Simply omit the missing content silently.

5. ACCURATE SCRIPTS ONLY
   When documenting run commands, use ONLY the exact command strings found in the
   scripts object of the provided package.json. Do not guess or normalise them.

6. NO EMPTY SECTIONS
   If a section has no supporting evidence in the context, DO NOT render it.
   Do not output a heading with no content beneath it. Do not output "##" alone.

7. NO DUPLICATE SECTIONS
   Each section must appear exactly once. Do not repeat headings or content.

8. MARKDOWN FORMATTING
   - Leave one blank line before AND after every heading, list, and code block.
   - Do NOT wrap your entire response in a markdown code fence.
   - All tables MUST include an alignment row (|---|---|) and open/close with pipes.

9. EMERGENCY SKIP RULE
   If you cannot populate a section with at least ONE concrete, evidence-based item
   from the provided context, output NOTHING for that section. Not even a heading.
   Silence is always better than hallucination.

`;

  // ── Base prompt ────────────────────────────────────────────────────────────
  const basePrompt =
    criticalDirective +
    'You are an elite Technical Writer documenting a real software project.\n\n' +
    '=== PROJECT METADATA ===\n' +
    `Project Name:      ${safeProjectName}\n` +
    `Primary Framework: ${stack.primary || 'Unknown'}\n` +
    `Language:          ${stack.language || 'Unknown'}\n` +
    contextFilesStr +
    featureConstraints + '\n' +
    `TASK: Generate ONLY the "${section.name}" section for ${safeProjectName}.\n` +
    'If you cannot find evidence for this section in the context, output nothing.\n';

  // ── Per-section instructions with explicit skip fallbacks ──────────────────
  //
  // IMPORTANT: Every "IF NO EVIDENCE" line below is a real instruction to the
  // AI model, not a comment. Keep them in ALL-CAPS so they stand out in the prompt.

  // structure section: only render if additionalContext is actually populated
  const structureBody = additionalContext?.trim()
    ? `## 📂 Project Structure\n\n\`\`\`text\n${additionalContext.trim()}\n\`\`\``
    : '';  // empty string → base prompt's "output nothing" rule kicks in

  // deployment section: only include Docker block when evidence exists
  const dockerBlock = stack.hasDocker
    ? `\n### Docker\n\`\`\`bash\ndocker build -t ${safeProjectName.toLowerCase()} .\n` +
      `docker run -p 3000:3000 ${safeProjectName.toLowerCase()}\n\`\`\``
    : '';

  // Use a null-prototype object so inherited keys (__proto__, constructor, etc.)
  // can never be reached via bracket notation with attacker-controlled input.
  const sectionInstructions: Record<string, string> = Object.assign(
    Object.create(null) as Record<string, string>,
  {
    header:
`Use the project name as an H1 heading.
Place these badges on the next line:
${badgeMarkdown}

Write a 2–3 sentence overview derived STRICTLY from the source code:
what the application does, who it is for, and its primary technical mechanism.
If no clear purpose can be determined from the code, write only the heading and badges.

Add a "## Quick Start" block ONLY if the commands below are valid and evidenced:
\`\`\`bash
${installCmd}
${devCmd}
\`\`\`

Add a "## ✨ Highlights" section with exactly 3 bullet points.
Each bullet must reference a specific technical feature evidenced in the code.
If fewer than 3 features are evidenced, output only what exists.`,

    features:
`## ✨ Core Features

Extract features ONLY from the provided source code (models, schemas, routes, components).
Format as a bulleted list with bold feature names and a one-sentence description.

IF NO FEATURES CAN BE EXTRACTED FROM THE CONTEXT, OUTPUT NOTHING FOR THIS SECTION.`,

    installation:
`## 🚀 Installation

### Prerequisites
${
  isFlutter
    ? '- Flutter SDK (>= 3.11.0)\n- Dart SDK'
    : isPython
      ? '- Python 3.8+\n- pip'
      : `- Node.js v18+\n- ${pkgMgr}`
}

### Setup

1. **Clone the repository**
\`\`\`bash
git clone ${repoUrl || `https://github.com/username/${safeProjectName}.git`}
cd ${safeProjectName}
\`\`\`

2. **Install dependencies**
\`\`\`bash
${installCmd}
\`\`\`

3. **Start the application**
\`\`\`bash
${devCmd}
\`\`\`

IF ANY COMMAND ABOVE IS NOT EVIDENCED IN PACKAGE.JSON, OMIT THAT STEP ENTIRELY.`,

    structure: structureBody,

    'tech-stack':
`## 🛠️ Tech Stack

Analyse the source code context and list ONLY the frameworks, databases, and
libraries that are ACTUALLY present as dependencies.
Format as this exact markdown table — include the alignment row:

| Category | Technology | Version |
| :--- | :--- | :--- |

Populate ONLY from real entries in the dependency files. Add one row per detected item.
IF NO DEPENDENCIES ARE EVIDENCED IN THE CONTEXT, OUTPUT NOTHING FOR THIS SECTION.`,

    environment:
`## ⚙️ Environment Variables

Document ONLY the variables present in the provided .env.example or config files.
Format as this exact markdown table — include the alignment row:

| Variable | Description | Required |
| :--- | :--- | :--- |

Populate ONLY from the actual .env.example content provided above.
IF NO .ENV.EXAMPLE OR CONFIG FILE WAS PROVIDED IN THE CONTEXT, OUTPUT NOTHING FOR THIS SECTION.`,

    scripts:
`## 📜 Available Commands

Document ONLY the scripts found in the "scripts" field of the provided package.json.
Format as a markdown table:

| Command | Description |
| :--- | :--- |

IF THE SCRIPTS FIELD IS ABSENT OR EMPTY IN PACKAGE.JSON, OUTPUT NOTHING FOR THIS SECTION.`,

    deployment:
`## 🚀 Deployment

### Production Build
\`\`\`bash
${buildCmd}
\`\`\`
${dockerBlock}

IF THE BUILD COMMAND ABOVE IS NOT EVIDENCED IN PACKAGE.JSON, AND NO DOCKER FILE EXISTS,
OUTPUT NOTHING FOR THIS SECTION.`,

    testing:
`## 🧪 Testing

\`\`\`bash
${testCmd}
\`\`\`

If test files are present in the context, briefly describe what is being tested.
Do NOT mention test tooling that is not in devDependencies.
IF NO TEST FILES AND NO TEST SCRIPT EXIST IN THE CONTEXT, OUTPUT NOTHING FOR THIS SECTION.`,

    'api-docs':
`## 📚 API Reference

Document ONLY the API routes or controllers present in the provided source-code context.
IF NO ROUTES OR CONTROLLERS EXIST IN THE CONTEXT, OUTPUT NOTHING FOR THIS SECTION.`,
  });

  // Guard against prototype-chain traversal: only access a key that is a
  // direct own property of the null-prototype map above.
  const safeId     = typeof section.id === 'string' ? section.id : '';
  const instruction =
    Object.hasOwn(sectionInstructions, safeId)
      ? sectionInstructions[safeId]
      : section.howToWrite ?? '';

  return `${basePrompt}\n${instruction}`;
}