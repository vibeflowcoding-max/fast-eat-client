/**
 * Safely constructs a secure URL from a base URL and a path.
 * Ensures the base URL starts with https:// (or http for localhost) to prevent insecure connections.
 *
 * @param baseUrl - The base URL, typically from an environment variable.
 * @param path - The path to append to the base URL.
 * @returns The fully constructed secure URL.
 * @throws Error if the baseUrl is missing or is not secure.
 */
export function constructSecureUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) {
    throw new Error('Base URL is required for URL construction');
  }

  const isLocalhost = baseUrl.startsWith('http://localhost') || baseUrl.startsWith('http://127.0.0.1');
  const isHttps = baseUrl.startsWith('https://');

  if (!isHttps && !isLocalhost) {
    throw new Error(`Insecure connection: Base URL must start with https://. Received: ${baseUrl}`);
  }

  // Remove trailing slashes from base URL
  const base = baseUrl.replace(/\/+$/, '');
  // Ensure path starts with exactly one slash
  const normalizedPath = '/' + path.replace(/^\/+/, '');

  return `${base}${normalizedPath}`;
}
