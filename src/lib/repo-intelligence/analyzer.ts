import type { FileContent } from '../../analyze';
import type { RepoProfile } from './types';
import { fetchTree } from './treeFetcher';
import { detectLanguageAndPackageManager } from './languageDetector';
import { resolveFrameworks } from './frameworkResolver';
import { classifyArchitecture } from './architectureClassifier';
import { probeFeatures } from './featureProbe';
import { mapFeaturesToSections } from './sectionEligibility';
import { buildContext } from './contextBuilder';

/**
 * Orchestrates the step‑by‑step Repo‑Intelligence pipeline.
 * Returns a fully populated RepoProfile object.
 */
export async function analyzeRepo(
  repoUrl: string,
  githubToken?: string,
  defaultBranch: string = 'main'
): Promise<RepoProfile> {
  // 1️⃣ Fetch the (truncated) file tree – we only need names for detection.
  const fileList: FileContent[] = await fetchTree(repoUrl, githubToken);

  // 2️⃣ Language & package‑manager detection.
  const { language, packageManager } = detectLanguageAndPackageManager(fileList);

  // 3️⃣ Resolve frameworks based on language & dependency files.
  const frameworks = resolveFrameworks(language, fileList);

  // 4️⃣ Architecture classification.
  const architecture = classifyArchitecture(fileList);

  // 5️⃣ Feature probing.
  const features = probeFeatures(fileList);

  // 6️⃣ Determine which README sections are relevant.
  const eligibleSections = mapFeaturesToSections(features);

  // 7️⃣ Build a token‑budgeted context (placeholder – no high‑value files fetched yet).
  const context = buildContext([]);

  // Assemble the final profile.
  const profile: RepoProfile = {
    repoUrl,
    defaultBranch,
    tree: JSON.stringify(fileList),
    language,
    frameworks,
    architecture,
    features,
    eligibleSections,
    tokenBudget: 8000,
    // additional fields defined in RepoProfile interface
    // (add defaults for any missing fields if the interface expands later)
  } as any; // cast to any to satisfy extra properties not yet defined in the interface

  return profile;
}
