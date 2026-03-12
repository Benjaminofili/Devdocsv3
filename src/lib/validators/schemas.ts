// src/lib/validators/schemas.ts

import { z } from 'zod';

// Stack Type Enum
export const StackTypeSchema = z.enum([
  'nextjs', 'react', 'vue', 'angular', 'express', 'nestjs',
  'django', 'flask', 'fastapi', 'go', 'rust', 'unknown'
]);

// Package Manager Enum
export const PackageManagerSchema = z.enum([
  'npm', 'yarn', 'pnpm', 'pip', 'poetry', 'go', 'cargo'
]);

// Detected Stack Schema
export const DetectedStackSchema = z.object({
  primary: StackTypeSchema,
  secondary: z.array(StackTypeSchema),
  language: z.string(),
  packageManager: PackageManagerSchema,
  hasDocker: z.boolean(),
  hasCI: z.boolean(),
  hasTesting: z.boolean(),
  hasEnvFile: z.boolean(),
  frameworks: z.array(z.string()),
  dependencies: z.record(z.string(), z.string()),
  domainHints: z.array(z.string()).optional(),
});

// Repo Data Schema
export const RepoDataSchema = z.object({
  files: z.array(z.object({
    name: z.string(),
    content: z.string(),
  })),
  structure: z.array(z.string()),
  packageJson: z.record(z.string(), z.unknown()).optional(),
  existingReadme: z.string().optional(),
  envExample: z.string().optional(),
  hasDocker: z.boolean().optional(),
  hasTests: z.boolean().optional(),
  hasCI: z.boolean().optional(),
});

// Generate Request Schema
export const GenerateRequestSchema = z.object({
  sectionId: z.string().min(1, 'Section ID is required'),
  stack: DetectedStackSchema,
  projectName: z.string().min(1, 'Project name is required'),
  repoUrl: z.string().url().optional().or(z.literal('')),
  repoData: RepoDataSchema.optional(),
  isFirstSection: z.boolean().optional(),
});

// Analyze Request Schema
export const AnalyzeRequestSchema = z.object({
  repoUrl: z.string().url().optional(),
  files: z.array(z.object({
    name: z.string(),
    content: z.string(),
  })).optional(),
}).refine(
  data => data.repoUrl || data.files,
  { message: 'Either repoUrl or files must be provided' }
);

// Clear Cache Request Schema
export const ClearCacheRequestSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
});

// Type exports
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type ClearCacheRequest = z.infer<typeof ClearCacheRequestSchema>;
export type DetectedStackInput = z.infer<typeof DetectedStackSchema>;
export type RepoDataInput = z.infer<typeof RepoDataSchema>;
