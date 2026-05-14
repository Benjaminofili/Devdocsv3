export type UserTier = 'anonymous' | 'free' | 'premium';

export interface DetectedStack {
  language: string;
  framework?: string;
  database?: string;
  auth?: string;
  styling?: string;
  tools?: string[];
}
