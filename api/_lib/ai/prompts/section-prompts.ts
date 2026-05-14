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
  section: SectionConfig,
  stack: DetectedStack,
  projectName: string,
  additionalContext?: string,
  repoUrl?: string
): string {
  const safeProjectName = typeof projectName === 'string' && projectName.trim() ? projectName : 'Project';
  const isPython = stack.language?.toLowerCase() === 'python';
  const pkgMgr = stack.packageManager || 'npm';
  
  // Dynamic Commands based on language
  const installCmd = isPython ? 'pip install -r requirements.txt' : `${pkgMgr} install`;
  const devCmd = isPython ? 'python app.py  # or python run.py' : `${pkgMgr === 'npm' ? 'npm run dev' : pkgMgr + ' dev'}`;
  const testCmd = isPython ? 'python -m pytest' : `${pkgMgr === 'npm' ? 'npm test' : pkgMgr + ' test'}`;
  const buildCmd = isPython ? '# No build step required for Python' : `${pkgMgr === 'npm' ? 'npm run build' : pkgMgr + ' build'}`;

  const githubInfo = extractGitHubInfo(repoUrl);
  const badgeMarkdown = githubInfo 
    ? `![License](https://img.shields.io/github/license/${githubInfo.owner}/${githubInfo.repo})\n![Stars](https://img.shields.io/github/stars/${githubInfo.owner}/${githubInfo.repo}?style=social)\n![Issues](https://img.shields.io/github/issues/${githubInfo.owner}/${githubInfo.repo})`
    : `![License](https://img.shields.io/badge/license-MIT-blue.svg)`;

  // Build Context Hydration String
  let contextFilesStr = '';
  if (stack.contextFiles && stack.contextFiles.length > 0) {
    contextFilesStr = `\n=== CRITICAL SOURCE CODE CONTEXT ===\nYou MUST base your answer strictly on the following minified repository files. Use these to identify the exact database schemas, core business logic, and actual dependencies:\n\n`;
    stack.contextFiles.forEach(file => {
      contextFilesStr += `--- START ${file.name} ---\n${file.content}\n--- END ${file.name} ---\n\n`;
    });
  }

  const basePrompt = `You are an elite Technical Writer and Senior Developer documenting a software project.

=== RULES OF ENGAGEMENT ===
1. ZERO HALLUCINATIONS: Do NOT invent features, endpoints, or scripts. If it is not in the source code context, do not mention it.
2. BE SPECIFIC: Say "SQLAlchemy database with User and Restaurant models" instead of "Provides database modeling."
3. TONE: Professional, concise, and developer-focused. No fluff.
4. FORMATTING: Output pure Markdown. Do not wrap your response in \`\`\`markdown blocks.

=== PROJECT METADATA ===
Project Name: ${safeProjectName}
Primary Framework: ${stack.primary || 'Unknown'}
Language: ${stack.language || 'Unknown'}
${contextFilesStr}

TASK: Generate ONLY the "${section.name}" section for ${safeProjectName}. Do not generate the rest of the README.
`;

  const sectionInstructions: Record<string, string> = {
    header: `Include the project title as an H1 heading.
Include these badges directly below the title:
${badgeMarkdown}

Analyze the provided source code context to write a highly specific 2-3 sentence overview of what this exact application does, who it is for, and its primary technical mechanism.

Add a "## Quick Start" heading with this code block:
\`\`\`bash
${installCmd}
${devCmd}
\`\`\`

Add a "## ✨ Highlights" heading with 3 bullet points highlighting the most complex or valuable technical features proven by the code.`,

    features: `## ✨ Core Features

Extract the main features DIRECTLY from the provided source code context. Look at models, schemas, and routes.
Format as a bulleted list with bold feature names and a brief description.
Example: "- **Role-Based Auth** - Supports Customers, Owners, and Admins."`,

    installation: `## 🚀 Installation

### Prerequisites
- ${isPython ? 'Python 3.8+' : 'Node.js v18+'}
- ${isPython ? 'pip' : pkgMgr}

### Setup Instructions

1. **Clone the repository**
\`\`\`bash
git clone ${repoUrl || `https://github.com/username/${safeProjectName}.git`}
cd ${safeProjectName}
\`\`\`

2. **Install dependencies**
\`\`\`bash
${installCmd}
\`\`\`

3. **Run the application**
\`\`\`bash
${devCmd}
\`\`\``,

    'tech-stack': `## 🛠️ Tech Stack

Analyze the provided source code context (e.g., package.json, requirements.txt) and list the ACTUAL frameworks, databases, and libraries used. Format as a clean Markdown table.`,

    environment: `## ⚙️ Environment Configuration

If an \`.env.example\` or configuration file is present in the context, document the required environment variables in a markdown table (Variable, Description, Required). If no specific variables are found, state that standard environment configuration is required.`,

    scripts: `## 📜 Available Commands

Document the scripts or commands used to run, build, or seed this project based on the provided context files.
For example: \`${installCmd}\` and \`${devCmd}\`.`,

    deployment: `## 🚀 Deployment

### Build
\`\`\`bash
${buildCmd}
\`\`\`

${stack.hasDocker ? `### Docker\n\`\`\`bash\ndocker build -t ${safeProjectName.toLowerCase()} .\ndocker run -p 3000:3000 ${safeProjectName.toLowerCase()}\n\`\`\`` : 'Document standard deployment practices for this framework.'}`,

    testing: `## 🧪 Testing

\`\`\`bash
${testCmd}
\`\`\`
If test files exist in the context, briefly mention what is being tested.`,

    'api-docs': `## 📚 API Reference

If API routes or controllers are present in the context, document the main endpoints, their methods, and purpose. If none exist, state that this is not an API-driven application.`,
  };

  return basePrompt + '\n\n' + (sectionInstructions[section.id] || section.howToWrite);
}
