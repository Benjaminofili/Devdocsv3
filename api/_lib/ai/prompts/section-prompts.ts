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
  const githubInfo = extractGitHubInfo(repoUrl);
  
  // Smart Fallback: If projectName is generic, extract it from the GitHub Repo Name
  let fallbackName = 'Project';
  if (githubInfo && githubInfo.repo) {
    fallbackName = githubInfo.repo.charAt(0).toUpperCase() + githubInfo.repo.slice(1);
  }
  const safeProjectName = (typeof projectName === 'string' && projectName.trim() && projectName !== 'Project') 
    ? projectName 
    : fallbackName;

  const isFlutter = stack.primary?.toLowerCase().includes('flutter') || stack.language?.toLowerCase() === 'dart';
  const isPython = stack.language?.toLowerCase() === 'python';
  const pkgMgr = stack.packageManager || 'npm';
  
  const installCmd = isFlutter ? 'flutter pub get' : (isPython ? 'pip install -r requirements.txt' : `${pkgMgr} install`);
  const devCmd = isFlutter ? 'flutter run' : (isPython ? 'python app.py' : `${pkgMgr === 'npm' ? 'npm run dev' : pkgMgr + ' dev'}`);
  const testCmd = isFlutter ? 'flutter test' : (isPython ? 'python -m pytest' : `${pkgMgr === 'npm' ? 'npm test' : pkgMgr + ' test'}`);
  const buildCmd = isFlutter ? 'flutter build apk --release' : (isPython ? '# No build step' : `${pkgMgr === 'npm' ? 'npm run build' : pkgMgr + ' build'}`);

  const badgeMarkdown = githubInfo 
    ? `![License](https://img.shields.io/github/license/${githubInfo.owner}/${githubInfo.repo})\n![Stars](https://img.shields.io/github/stars/${githubInfo.owner}/${githubInfo.repo}?style=social)\n![Issues](https://img.shields.io/github/issues/${githubInfo.owner}/${githubInfo.repo})`
    : `![License](https://img.shields.io/badge/license-MIT-blue.svg)`;

  let contextFilesStr = '';
  if (stack.contextFiles && stack.contextFiles.length > 0) {
    contextFilesStr = `\n=== CRITICAL SOURCE CODE CONTEXT ===\nYou MUST base your answer strictly on the following minified repository files:\n\n`;
    stack.contextFiles.forEach(file => {
      contextFilesStr += `--- START ${file.name} ---\n${file.content}\n--- END ${file.name} ---\n\n`;
    });
  }

  const basePrompt = `You are an elite Technical Writer documenting a software project.

=== RULES OF ENGAGEMENT ===
1. ZERO HALLUCINATIONS: Do not invent features or scripts not present in the context.
2. BE SPECIFIC: Use exact framework names and technical terms.
3. TONE: Professional, concise, and developer-focused.
4. STRICT MARKDOWN FORMATTING: 
   - You MUST leave a blank empty line before AND after every heading, list, and table.
   - Do NOT wrap your entire response in \`\`\`markdown blocks.
5. TABLES: All tables MUST have proper alignment rows (e.g., |---|---|---|) and start/end with pipes.

=== PROJECT METADATA ===
Project Name: ${safeProjectName}
Primary Framework: ${stack.primary || 'Unknown'}
Language: ${stack.language || 'Unknown'}
${contextFilesStr}

TASK: Generate ONLY the "${section.name}" section for ${safeProjectName}.
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
${isFlutter ? '- Flutter SDK (>= 3.11.0)\n- Dart SDK' : (isPython ? '- Python 3.8+\n- pip' : '- Node.js v18+\n- ' + pkgMgr)}

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
\`\`\`
`,

    structure: `## 📂 Project Structure

\`\`\`text
${additionalContext || 'No structure provided'}
\`\`\`
`,

    'tech-stack': `## 🛠️ Tech Stack

Analyze the provided source code context and list the ACTUAL frameworks, databases, and libraries used.
You MUST format it EXACTLY like this markdown table, including the pipes and dashes:

| Category | Technology | Version |
| :--- | :--- | :--- |
| Framework | Flask | 3.1.3 |
| Database | PostgreSQL | 15.0 |`,

    environment: `## ⚙️ Environment Configuration

If an \`.env.example\` or configuration file is present, document the required variables. 
You MUST format it EXACTLY like this markdown table:

| Variable | Description | Required |
| :--- | :--- | :--- |
| DATABASE_URL | Connection string | Yes |`,

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
