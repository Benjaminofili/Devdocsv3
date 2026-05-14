// src/lib/analyzers/index.ts

import { DetectedStack } from '../types.js';
import { logger } from '../logger.js';

interface FileContent {
  name: string;
  content: string;
}

export class StackAnalyzer {
  private files: FileContent[];

  constructor(files: FileContent[]) {
    this.files = files;
  }

  analyze(): DetectedStack {
    const packageJson = this.findFile('package.json');
    const requirementsTxt = this.findFile('requirements.txt');
    const goMod = this.findFile('go.mod');
    const cargoToml = this.findFile('Cargo.toml');

    // Detect primary stack
    let stack: DetectedStack = {
      primary: 'unknown',
      secondary: [],
      language: 'unknown',
      packageManager: 'npm',
      hasDocker: this.hasFile('Dockerfile') || this.hasFile('docker-compose.yml'),
      hasCI: this.hasFile('.github/workflows') || this.hasFile('.gitlab-ci.yml'),
      hasTesting: false,
      hasEnvFile: this.hasFile('.env.example') || this.hasFile('.env.sample'),
      frameworks: [],
      dependencies: {},
      domainHints: this.extractDomainHints(),
    };

    // JavaScript/TypeScript ecosystem
    if (packageJson) {
      stack = this.analyzeJavaScript(packageJson, stack);
    }

    // Python ecosystem
    if (requirementsTxt || this.hasFile('pyproject.toml')) {
      stack = this.analyzePython(stack);
    }

    // Go ecosystem
    if (goMod) {
      stack = this.analyzeGo(goMod, stack);
    }

    // Rust ecosystem
    if (cargoToml) {
      stack = this.analyzeRust(cargoToml, stack);
    }

    return stack;
  }

  private analyzeJavaScript(packageJsonContent: string, stack: DetectedStack): DetectedStack {
    try {
      const pkg = JSON.parse(packageJsonContent);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };

      stack.language = allDeps['typescript'] ? 'TypeScript' : 'JavaScript';
      stack.dependencies = allDeps;

      // Detect package manager
      if (this.hasFile('pnpm-lock.yaml')) {
        stack.packageManager = 'pnpm';
      } else if (this.hasFile('yarn.lock')) {
        stack.packageManager = 'yarn';
      } else {
        stack.packageManager = 'npm';
      }

      // Detect frameworks
      if (allDeps['next']) {
        stack.primary = 'nextjs';
        stack.frameworks.push('Next.js');
      } else if (allDeps['react']) {
        stack.primary = 'react';
        stack.frameworks.push('React');
      } else if (allDeps['vue']) {
        stack.primary = 'vue';
        stack.frameworks.push('Vue.js');
      } else if (allDeps['@angular/core']) {
        stack.primary = 'angular';
        stack.frameworks.push('Angular');
      } else if (allDeps['express']) {
        stack.primary = 'express';
        stack.frameworks.push('Express.js');
      } else if (allDeps['@nestjs/core']) {
        stack.primary = 'nestjs';
        stack.frameworks.push('NestJS');
      }

      // Detect secondary tools
      if (allDeps['tailwindcss']) stack.frameworks.push('Tailwind CSS');
      if (allDeps['prisma']) stack.frameworks.push('Prisma');
      if (allDeps['mongoose']) stack.frameworks.push('MongoDB/Mongoose');
      if (allDeps['jest'] || allDeps['vitest']) stack.hasTesting = true;

    } catch (error) {
      logger.error('Failed to parse package.json:', error);
    }

    return stack;
  }

  private analyzePython(stack: DetectedStack): DetectedStack {
    stack.language = 'Python';
    stack.packageManager = this.hasFile('poetry.lock') ? 'poetry' : 'pip';

    const requirements = this.findFile('requirements.txt') || '';

    if (requirements.includes('django') || this.hasFile('manage.py')) {
      stack.primary = 'django';
      stack.frameworks.push('Django');
    } else if (requirements.includes('flask')) {
      stack.primary = 'flask';
      stack.frameworks.push('Flask');
    } else if (requirements.includes('fastapi')) {
      stack.primary = 'fastapi';
      stack.frameworks.push('FastAPI');
    }

    if (requirements.includes('pytest')) stack.hasTesting = true;

    return stack;
  }

  private analyzeGo(goModContent: string, stack: DetectedStack): DetectedStack {
    stack.language = 'Go';
    stack.primary = 'go';
    stack.packageManager = 'go';

    if (goModContent.includes('gin-gonic')) {
      stack.frameworks.push('Gin');
    }
    if (goModContent.includes('echo')) {
      stack.frameworks.push('Echo');
    }
    if (goModContent.includes('fiber')) {
      stack.frameworks.push('Fiber');
    }

    return stack;
  }

  private analyzeRust(cargoContent: string, stack: DetectedStack): DetectedStack {
    stack.language = 'Rust';
    stack.primary = 'rust';
    stack.packageManager = 'cargo';

    if (cargoContent.includes('actix-web')) {
      stack.frameworks.push('Actix Web');
    }
    if (cargoContent.includes('axum')) {
      stack.frameworks.push('Axum');
    }

    return stack;
  }

  private findFile(name: string): string | null {
    const file = this.files.find(f =>
      f.name === name || f.name.endsWith(`/${name}`)
    );
    return file?.content || null;
  }

  private hasFile(name: string): boolean {
    return this.files.some(f =>
      f.name === name ||
      f.name.includes(name) ||
      f.name.endsWith(`/${name}`)
    );
  }

  private extractDomainHints(): string[] {
    const hints: string[] = [];

    // Analyze file names for domain clues
    const fileNames = this.files.map(f => f.name.toLowerCase());

    // E-commerce hints
    if (fileNames.some(name => name.includes('cart') || name.includes('product') || name.includes('order') || name.includes('payment') || name.includes('checkout'))) {
      hints.push('e-commerce');
    }

    // Food/Restaurant hints
    if (fileNames.some(name => name.includes('menu') || name.includes('recipe') || name.includes('order') || name.includes('delivery') || name.includes('food'))) {
      hints.push('food-restaurant');
    }

    // Social media hints
    if (fileNames.some(name => name.includes('post') || name.includes('comment') || name.includes('like') || name.includes('follow') || name.includes('profile'))) {
      hints.push('social-media');
    }

    // Task management hints
    if (fileNames.some(name => name.includes('task') || name.includes('todo') || name.includes('project') || name.includes('deadline'))) {
      hints.push('task-management');
    }

    // Blog/CMS hints
    if (fileNames.some(name => name.includes('blog') || name.includes('post') || name.includes('article') || name.includes('content'))) {
      hints.push('blog-cms');
    }

    // Analytics/Dashboard hints
    if (fileNames.some(name => name.includes('dashboard') || name.includes('analytics') || name.includes('chart') || name.includes('report'))) {
      hints.push('analytics-dashboard');
    }

    // Education hints
    if (fileNames.some(name => name.includes('course') || name.includes('lesson') || name.includes('quiz') || name.includes('student'))) {
      hints.push('education');
    }

    // Health/Fitness hints
    if (fileNames.some(name => name.includes('workout') || name.includes('exercise') || name.includes('health') || name.includes('fitness'))) {
      hints.push('health-fitness');
    }

    // Analyze package.json for domain-specific dependencies
    const packageJson = this.findFile('package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Payment-related dependencies
        if (deps['stripe'] || deps['paypal-rest-sdk'] || deps['square']) {
          hints.push('payment-processing');
        }

        // Mapping/location dependencies
        if (deps['google-maps'] || deps['mapbox'] || deps['leaflet']) {
          hints.push('location-services');
        }

        // Image processing
        if (deps['sharp'] || deps['jimp'] || deps['canvas']) {
          hints.push('image-processing');
        }

        // Email services
        if (deps['nodemailer'] || deps['sendgrid'] || deps['aws-ses']) {
          hints.push('email-services');
        }

        // Authentication services
        if (deps['auth0'] || deps['firebase-auth'] || deps['next-auth']) {
          hints.push('authentication');
        }

        // Database hints
        if (deps['mongoose'] || deps['mongodb']) {
          hints.push('mongodb-database');
        }
        if (deps['prisma'] || deps['sequelize'] || deps['typeorm']) {
          hints.push('orm-database');
        }
      } catch {
        // Ignore parsing errors
      }
    }

    return [...new Set(hints)]; // Remove duplicates
  }
}
