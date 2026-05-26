// api/_lib/intelligence/repo-analyzer.ts

export interface TreeNode {
  path: string;
  mode: string;
  type: 'blob' | 'tree'; // 'blob' is a file, 'tree' is a directory
  sha: string;
  size?: number;
  url: string;
}

export interface RepoProfile {
  languages: Record<string, number>;
  frameworks: string[];
  architecture: 'monorepo' | 'standard' | 'unknown';
  features: {
    hasDocker: boolean;
    hasCICD: boolean;
    hasTesting: boolean;
    hasLinting: boolean;
    hasEnvExample: boolean;
  };
  keyFiles: string[]; // Paths of important files we need to fetch content for later
}

export class RepoAnalyzer {
  private tree: TreeNode[];

  constructor(tree: TreeNode[]) {
    this.tree = tree;
  }

  public analyze(): RepoProfile {
    return {
      languages: this.detectLanguages(),
      frameworks: this.detectFrameworks(),
      architecture: this.detectArchitecture(),
      features: this.detectFeatures(),
      keyFiles: this.findKeyFiles()
    };
  }

  private detectLanguages(): Record<string, number> {
    const languages: Record<string, number> = {};
    const extMap: Record<string, string> = {
      '.ts': 'TypeScript', '.tsx': 'TypeScript',
      '.js': 'JavaScript', '.jsx': 'JavaScript',
      '.py': 'Python', '.rs': 'Rust', '.go': 'Go',
      '.java': 'Java', '.rb': 'Ruby', '.php': 'PHP',
      '.css': 'CSS', '.scss': 'SCSS', '.html': 'HTML'
    };

    for (const node of this.tree) {
      if (node.type === 'blob' && node.size) {
        const ext = node.path.substring(node.path.lastIndexOf('.'));
        const lang = extMap[ext];
        if (lang) {
          languages[lang] = (languages[lang] || 0) + node.size;
        }
      }
    }
    return languages;
  }

  private detectFrameworks(): string[] {
    const frameworks = new Set<string>();
    const paths = this.tree.map(n => n.path.toLowerCase());

    if (paths.some(p => p.includes('next.config'))) frameworks.add('nextjs');
    if (paths.some(p => p.includes('vite.config'))) frameworks.add('vite');
    if (paths.some(p => p.includes('tailwind.config'))) frameworks.add('tailwindcss');
    if (paths.some(p => p.includes('cargo.toml'))) frameworks.add('rust');
    if (paths.some(p => p.includes('go.mod'))) frameworks.add('go');
    if (paths.some(p => p.includes('requirements.txt') || p.includes('pipfile'))) frameworks.add('python');
    if (paths.some(p => p.includes('pom.xml') || p.includes('build.gradle'))) frameworks.add('java');
    
    return Array.from(frameworks);
  }

  private detectArchitecture(): 'monorepo' | 'standard' | 'unknown' {
    const paths = this.tree.map(n => n.path);
    const isMonorepo = paths.some(p => 
      p.includes('pnpm-workspace.yaml') || 
      p.includes('lerna.json') || 
      p.includes('nx.json') ||
      p.includes('turbo.json')
    );
    
    const packageJsons = paths.filter(p => p.endsWith('package.json') && !p.includes('node_modules'));
    if (packageJsons.length > 1) return 'monorepo';

    return isMonorepo ? 'monorepo' : 'standard';
  }

  private detectFeatures(): RepoProfile['features'] {
    const paths = this.tree.map(n => n.path.toLowerCase());
    
    return {
      hasDocker: paths.some(p => p.includes('dockerfile') || p.includes('docker-compose')),
      hasCICD: paths.some(p => p.includes('.github/workflows') || p.includes('.gitlab-ci.yml')),
      hasTesting: paths.some(p => p.includes('jest.config') || p.includes('vitest') || p.includes('.spec.') || p.includes('.test.') || p.includes('pytest.ini')),
      hasLinting: paths.some(p => p.includes('.eslintrc') || p.includes('prettier') || p.includes('biome.json')),
      hasEnvExample: paths.some(p => p.includes('.env.example') || p.includes('.env.local.example')),
    };
  }

  private findKeyFiles(): string[] {
    const keyFileNames = [
      'package.json', 'requirements.txt', 'cargo.toml', 'go.mod', 
      'readme.md', 'dockerfile', 'docker-compose.yml'
    ];
    
    return this.tree
      .filter(n => n.type === 'blob' && keyFileNames.includes(n.path.toLowerCase().split('/').pop() || ''))
      .map(n => n.path);
  }
}
