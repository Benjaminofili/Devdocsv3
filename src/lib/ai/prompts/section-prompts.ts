// src/lib/ai/prompts/section-prompts.ts
import { DetectedStack, SectionConfig } from '../../../types';
import { logger } from '../../logger';

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
  section: SectionConfig,
  stack: DetectedStack,
  projectName: string,
  additionalContext?: string,
  repoUrl?: string
): string {
  const safeProjectName = typeof projectName === 'string' && projectName.trim() 
    ? projectName 
    : 'Project';
  const safeContext = typeof additionalContext === 'string' 
    ? additionalContext 
    : '';

  const githubInfo = extractGitHubInfo(repoUrl);
  
  const badgeMarkdown = githubInfo 
    ? `![License](https://img.shields.io/github/license/${githubInfo.owner}/${githubInfo.repo})
![Stars](https://img.shields.io/github/stars/${githubInfo.owner}/${githubInfo.repo}?style=social)
![Issues](https://img.shields.io/github/issues/${githubInfo.owner}/${githubInfo.repo})`
    : `![License](https://img.shields.io/badge/license-MIT-blue.svg)`;

  const basePrompt = `You are a technical writer creating a README section.

=== RULES ===
1. ONLY describe features that actually exist in the code
2. DO NOT invent features like "commenting", "user profiles", "blog posting"
3. Look at actual dependencies and scripts to determine functionality
4. Use package.json description if available
5. Under 250 words, clean markdown only

=== PROJECT DATA ===
${safeContext || `Project: ${safeProjectName}, Stack: ${stack.primary}`}

TASK: Generate the "${section.name}" section for ${safeProjectName}.
`;

  const dockerName = safeProjectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const sectionInstructions: Record<string, string> = {
    header: `# ${safeProjectName}

${badgeMarkdown}

Write a clear 1-2 sentence description based on the actual project data above.
If it has AI dependencies + generate/analyze APIs, it's a documentation/README generator.

## Quick Start
\`\`\`bash
${stack.packageManager === 'npm' ? 'npm install && npm run dev' : 
  stack.packageManager === 'yarn' ? 'yarn && yarn dev' : 'pnpm install && pnpm dev'}
\`\`\`

## ✨ Highlights
- List 3-4 highlights based on ACTUAL dependencies only`,

    features: `## ✨ Features

List features based on ACTUAL dependencies only:

Format each as:
- **Feature Name** - Brief description

DO NOT invent features. Only include what's proven by dependencies/code.`,

    installation: `## 🚀 Installation

### Prerequisites
- Node.js v18+
- ${stack.packageManager}

### Steps

1. **Clone the repository**
\`\`\`bash
git clone ${repoUrl || `https://github.com/username/${safeProjectName}.git`}
cd ${safeProjectName}
\`\`\`

2. **Install dependencies**
\`\`\`bash
${stack.packageManager === 'npm' ? 'npm install' : stack.packageManager === 'yarn' ? 'yarn' : 'pnpm install'}
\`\`\`

3. **Set up environment**
\`\`\`bash
cp .env.example .env
\`\`\`

4. **Start development**
\`\`\`bash
${stack.packageManager === 'npm' ? 'npm run dev' : stack.packageManager === 'yarn' ? 'yarn dev' : 'pnpm dev'}
\`\`\``,

    'tech-stack': `## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | ${stack.primary} |
| Language | ${stack.language} |

Add only technologies from actual dependencies.`,

    environment: `## ⚙️ Environment Variables

Create a \`.env\` file based on \`.env.example\`:

\`\`\`env
# Add variables from .env.example if provided in context
# Otherwise, list based on dependencies
\`\`\`

| Variable | Description | Required |
|----------|-------------|----------|`,

    scripts: `## 📜 Available Scripts

| Command | Description |
|---------|-------------|

List only scripts that exist in package.json.`,

    deployment: `## 🚀 Deployment

### Build
\`\`\`bash
${stack.packageManager === 'npm' ? 'npm run build' : stack.packageManager === 'yarn' ? 'yarn build' : 'pnpm build'}
\`\`\`

${stack.primary === 'nextjs' ? `### Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)` : ''}

${stack.hasDocker ? `### Docker
\`\`\`bash
docker build -t ${dockerName} .
docker run -p 3000:3000 ${dockerName}
\`\`\`` : ''}`,

    contributing: `## 🤝 Contributing

1. Fork the repository
2. Create feature branch: \`git checkout -b feature/your-feature\`
3. Commit changes: \`git commit -m 'Add feature'\`
4. Push: \`git push origin feature/your-feature\`
5. Open Pull Request`,

    license: `## 📄 License

MIT License - see [LICENSE](LICENSE) for details.`,

    testing: `## 🧪 Testing

\`\`\`bash
${stack.packageManager === 'npm' ? 'npm test' : stack.packageManager === 'yarn' ? 'yarn test' : 'pnpm test'}
\`\`\``,

    'api-docs': `## 📚 API Reference

Document actual API routes from the project.`,
  };

  return basePrompt + '\n\n' + (sectionInstructions[section.id] || section.howToWrite);
}
