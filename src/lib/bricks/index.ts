// src/lib/bricks/index.ts

import { SectionConfig,  DetectedStack } from '../../types';

export const SECTION_BRICKS: SectionConfig[] = [
  {
    id: 'header',
    name: 'Project Header',
    description: 'Title, badges, and short description',
    whyImportant: `The header is the first thing people see. It tells them instantly what your project does 
    and shows professionalism through badges (build status, version, license). Recruiters often spend 
    less than 30 seconds on a README - make those seconds count!`,
    howToWrite: `1. Start with your project name as an H1
2. Add a one-line description that answers "What does this do?"
3. Include relevant badges (we'll generate these for you)
4. Optionally add a screenshot or demo GIF`,
    videoUrl: 'https://youtube.com/watch?v=example',
    docsUrl: 'https://shields.io',
    isRecommended: true,
    isRequired: true,
    stackSpecific: [],
    template: 'header',
    order: 1,
  },
  {
    id: 'features',
    name: 'Features',
    description: 'Key features and capabilities',
    whyImportant: `Features help users quickly understand if your project solves their problem. 
    It's also a great way to showcase your technical skills to potential employers!`,
    howToWrite: `List 4-6 main features using bullet points. Each feature should:
- Start with an emoji for visual appeal
- Be concise (one line)
- Focus on benefits, not just functionality`,
    isRecommended: true,
    isRequired: false,
    stackSpecific: [],
    template: 'features',
    order: 2,
  },
  {
    id: 'tech-stack',
    name: 'Tech Stack',
    description: 'Technologies and tools used',
    whyImportant: `Showing your tech stack helps developers quickly assess if they can contribute. 
    For job seekers, it's a way to demonstrate your knowledge of industry tools.`,
    howToWrite: `Group technologies by category:
- Frontend: React, TypeScript, Tailwind
- Backend: Node.js, Express, PostgreSQL
- DevOps: Docker, GitHub Actions`,
    isRecommended: true,
    isRequired: false,
    stackSpecific: [],
    template: 'tech-stack',
    order: 3,
  },
  {
    id: 'installation',
    name: 'Installation',
    description: 'How to install and set up locally',
    whyImportant: `Clear installation instructions lower the barrier to contribution. 
    Nothing frustrates developers more than spending hours trying to run a project locally!`,
    howToWrite: `Use numbered steps with exact commands:
1. Clone the repo
2. Install dependencies
3. Set up environment variables
4. Run the project`,
    isRecommended: true,
    isRequired: true,
    stackSpecific: [],
    template: 'installation',
    order: 4,
  },
  {
    id: 'environment',
    name: 'Environment Variables',
    description: 'Required environment configuration',
    whyImportant: `Environment variables keep sensitive data (API keys, database URLs) secure. 
    Documenting them prevents the #1 setup issue: "It works on my machine!"`,
    howToWrite: `Create a table with:
- Variable name
- Description
- Example value (never real secrets!)
- Whether it's required`,
    isRecommended: true,
    isRequired: false,
    stackSpecific: [],
    template: 'environment',
    order: 5,
  },
  {
    id: 'scripts',
    name: 'Available Scripts',
    description: 'npm/yarn/pnpm scripts explained',
    whyImportant: `Documenting scripts saves time for contributors. They won't need to 
    dig through package.json to figure out how to run tests or build the project.`,
    howToWrite: `List each script with:
- The command to run it
- What it does
- When to use it`,
    isRecommended: true,
    isRequired: false,
    stackSpecific: ['nextjs', 'react', 'vue', 'angular', 'express', 'nestjs'],
    template: 'scripts',
    order: 6,
  },
  {
    id: 'api-docs',
    name: 'API Documentation',
    description: 'API endpoints and usage',
    whyImportant: `If your project has an API, documenting it is crucial. 
    Good API docs can make or break developer adoption of your project.`,
    howToWrite: `For each endpoint, document:
- HTTP method and path
- Request parameters/body
- Response format
- Example request/response`,
    isRecommended: true,
    isRequired: false,
    stackSpecific: ['express', 'nestjs', 'fastapi', 'django', 'flask', 'go'],
    template: 'api-docs',
    order: 7,
    },
  {
    id: 'deployment',
    name: 'Deployment',
    description: 'How to deploy to production',
    whyImportant: `Deployment instructions show you understand the full development lifecycle. 
    It helps users actually USE your project, not just look at the code.`,
    howToWrite: `Include:
- Recommended hosting platform
- Step-by-step deployment instructions
- Any special configuration needed`,
    isRecommended: true,
    isRequired: false,
    stackSpecific: [],
    template: 'deployment',
    order: 8,
  },
  {
    id: 'docker',
    name: 'Docker Setup',
    description: 'Container configuration',
    whyImportant: `Docker ensures consistent environments across all machines. 
    Including Docker setup shows you understand modern DevOps practices.`,
    howToWrite: `Document:
- How to build the image
- How to run the container
- Docker Compose commands if applicable
- Volume mappings and ports`,
    isRecommended: false,
    isRequired: false,
    stackSpecific: [],
    template: 'docker',
    order: 9,
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'How to run tests',
    whyImportant: `Tests prove your code works and show you care about quality. 
    Recruiters love seeing testing in personal projects - it shows maturity!`,
    howToWrite: `Include:
- How to run all tests
- How to run specific test suites
- How to check coverage
- Testing conventions used`,
    isRecommended: true,
    isRequired: false,
    stackSpecific: [],
    template: 'testing',
    order: 10,
  },
  {
    id: 'contributing',
    name: 'Contributing',
    description: 'Guidelines for contributors',
    whyImportant: `Contributing guidelines make your project welcoming to new contributors. 
    Open source contributions look GREAT on a resume!`,
    howToWrite: `Cover:
- How to report bugs
- How to suggest features
- Pull request process
- Code style guidelines`,
    docsUrl: 'https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions',
    isRecommended: true,
    isRequired: false,
    stackSpecific: [],
    template: 'contributing',
    order: 11,
  },
  {
    id: 'license',
    name: 'License',
    description: 'Project license information',
    whyImportant: `A license tells others how they can use your code. Without one, 
    your project is technically "all rights reserved" - not truly open source!`,
    howToWrite: `Simply state the license type and link to the full text.
    Common choices:
    - MIT: Very permissive, good for portfolios
    - Apache 2.0: Like MIT but with patent protection
    - GPL: Requires derivative works to also be open source`,
    docsUrl: 'https://choosealicense.com',
    isRecommended: true,
    isRequired: true,
    stackSpecific: [],
    template: 'license',
    order: 12,
  },
];

// Get sections recommended for a specific stack
export function getSectionsForStack(stack: DetectedStack): SectionConfig[] {
  return SECTION_BRICKS
    .filter(section => {
      if (section.stackSpecific.length === 0) return true;
      return section.stackSpecific.includes(stack.primary);
    })
    .map(section => ({
      ...section,
      isRecommended: section.id === 'docker' 
        ? stack.hasDocker 
        : section.id === 'testing'
          ? stack.hasTesting
          : section.isRecommended,
    }))
    .sort((a, b) => a.order - b.order);
}
