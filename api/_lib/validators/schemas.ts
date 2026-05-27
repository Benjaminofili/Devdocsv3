import { z } from 'zod';

// ─────────────────────────────────────────────
// Primitives / Enums
// ─────────────────────────────────────────────

export const StackTypeSchema = z.enum([
  'nextjs', 'react', 'vue', 'angular',
  'express', 'nestjs', 'django', 'flask',
  'fastapi', 'go', 'rust', 'unknown',
]);

export const PackageManagerSchema = z.enum([
  'npm', 'yarn', 'pnpm', 'pip', 'poetry', 'go', 'cargo',
]);

// ─────────────────────────────────────────────
// Stack
// ─────────────────────────────────────────────

export const DetectedStackSchema = z.object({
  primary: StackTypeSchema,
  secondary: z.array(StackTypeSchema).default([]),
  language: z.string(),
  packageManager: PackageManagerSchema,
  hasDocker: z.boolean(),
  hasCI: z.boolean(),
  hasTesting: z.boolean(),
  hasEnvFile: z.boolean(),
  frameworks: z.array(z.string()).default([]),
  dependencies: z.record(z.string(), z.string()).default({}),
  domainHints: z.array(z.string()).default([]),
});

// ─────────────────────────────────────────────
// Context files (top-N files sent to the LLM)
// Capped at 5 to protect token budget.
// ─────────────────────────────────────────────

export const ContextFileSchema = z.object({
  name: z.string(),
  content: z.string().max(8_000, 'Trim large files before sending'), // ~2k tokens each
});

// ─────────────────────────────────────────────
// Repo profile  (output of /api/analyze)
// This is what the "V2 Brain" produces — rich semantic
// understanding of the project. Kept loose with z.any()
// sub-fields so the shape can evolve without breaking the
// contract; tighten individual fields as they stabilise.
// ─────────────────────────────────────────────

export const RepoProfileSchema = z.record(z.string(), z.any());

// ─────────────────────────────────────────────
// Minified package.json
// Only the fields that matter to the LLM.
// Strip the rest on the backend before building the prompt.
// ─────────────────────────────────────────────

export const MinifiedPackageJsonSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  scripts: z.record(z.string(), z.string()).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

// ─────────────────────────────────────────────
// V3 — Master Generate Request  ✦ THE NEW CONTRACT ✦
//
// One call, one prompt, one cohesive README.
// The old per-section GenerateRequestSchema is retired.
// ─────────────────────────────────────────────

export const GenerateMasterSchema = z.object({
  /** Human-readable project name (from GitHub repo or user input). */
  projectName: z.string().min(1, 'Project name is required'),

  /** Source repo URL — used for badge generation etc. */
  repoUrl: z.string().url().optional(),

  /**
   * Ordered list of section IDs the user selected.
   * e.g. ['header', 'features', 'tech-stack', 'installation']
   * The LLM writes ONLY these sections, in this order.
   */
  selectedSectionIds: z
    .array(z.string().min(1))
    .min(1, 'Select at least one section')
    .max(12, 'Too many sections in one pass'),

  stack: DetectedStackSchema,

  /** Rich semantic profile produced by /api/analyze */
  repoProfile: RepoProfileSchema,

  /** Stripped-down package.json — use minifyPackageJson() before sending. */
  packageJson: MinifiedPackageJsonSchema.optional(),

  /** Raw .env.example content if the repo has one */
  envExample: z.string().max(3_000).optional(),

  /** Top-N files most relevant to the README (max 5) */
  contextFiles: z.array(ContextFileSchema).max(5).default([]),

  /**
   * What to do when a selected section has no supporting data.
   * - 'placeholder' → write a best-practice stub for the detected stack
   * - 'skip'        → omit the section silently
   * Defaults to 'placeholder'.
   */
  fallbackStrategy: z.enum(['placeholder', 'skip']).default('placeholder'),

  /**
   * Force a fresh LLM call even when a cached response exists.
   * Useful for "Regenerate" buttons.
   */
  bypassCache: z.boolean().default(false),
});

// ─────────────────────────────────────────────
// Other API contracts (unchanged / lightly updated)
// ─────────────────────────────────────────────

export const AnalyzeRequestSchema = z
  .object({
    repoUrl: z.string().url().optional(),
    files: z
      .array(z.object({ name: z.string(), content: z.string() }))
      .optional(),
  })
  .refine(data => data.repoUrl || data.files, {
    message: 'Either repoUrl or files must be provided',
  });

export const SaveReadmeSchema = z.object({
  repoUrl: z.string().optional().default(''),
  projectName: z.string().optional().default('Untitled Project'),
  sectionId: z.string().optional().default('full'),
  content: z.string().min(1, 'Content cannot be empty'),
  stack: z.any().optional(),
});

export const ClearCacheRequestSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
});

// ─────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────

export type GenerateMasterRequest  = z.infer<typeof GenerateMasterSchema>;
export type AnalyzeRequest         = z.infer<typeof AnalyzeRequestSchema>;
export type SaveReadmeRequest      = z.infer<typeof SaveReadmeSchema>;
export type ClearCacheRequest      = z.infer<typeof ClearCacheRequestSchema>;
export type DetectedStack          = z.infer<typeof DetectedStackSchema>;
export type RepoProfile            = z.infer<typeof RepoProfileSchema>;
export type MinifiedPackageJson    = z.infer<typeof MinifiedPackageJsonSchema>;
export type ContextFile            = z.infer<typeof ContextFileSchema>;
