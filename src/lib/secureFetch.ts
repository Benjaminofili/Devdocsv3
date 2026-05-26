// src/lib/secureFetch.ts
import { getAuth } from 'firebase/auth';

/**
 * Wrapper around fetch that automatically includes a Firebase ID token as a Bearer header.
 * It merges any user‑provided headers and adds "Authorization: Bearer <token>" when the user is logged in.
 */
export async function secureFetch(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAuth().currentUser?.getIdToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const mergedHeaders = {
    ...(init.headers || {}),
    ...authHeader,
  };

  return fetch(input, { ...init, headers: mergedHeaders });
}
