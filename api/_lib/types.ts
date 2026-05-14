export type UserTier = 'anonymous' | 'free' | 'premium';

export interface DetectedStack {
  language: string;
  framework?: string;
  database?: string;
  auth?: string;
  styling?: string;
  tools?: string[];
  primary?: string;
  secondary?: string;
  packageManager?: string;
  hasDocker?: boolean;
  hasTesting?: boolean;
  hasCI?: boolean;
  domainHints?: string[];
  version?: string;
}
