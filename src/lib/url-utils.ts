/**
 * Safely constructs a secure URL from a base URL and a path.
 * Ensures the base URL starts with https:// (or http for localhost) to prevent insecure connections.
 *
 * @param baseUrl - The base URL, typically from an environment variable.
 * @param path - The path to append to the base URL.
 * @returns The fully constructed secure URL.
 * @throws Error if the baseUrl is missing, invalid, or is not secure.
 */
export function constructSecureUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) {
    throw new Error('Base URL is required for URL construction');
  }

  // Enforce secure protocol on the base URL
  const isLocalhost = baseUrl.startsWith('http://localhost') || baseUrl.startsWith('http://127.0.0.1');
  const isHttps = baseUrl.startsWith('https://');

  if (!isHttps && !isLocalhost) {
    throw new Error(`Insecure connection: Base URL must start with https://. Received: ${baseUrl}`);
  }

  try {
    const url = new URL(path, baseUrl);
    const baseOrigin = new URL(baseUrl).origin;

    // SSRF Protection: Ensure the path didn't override the base URL's origin.
    // This prevents absolute paths (e.g. "https://attacker.com") or
    // protocol-relative paths (e.g. "//attacker.com") from working.
    if (url.origin !== baseOrigin) {
      throw new Error(`Invalid path: Path must not change the URL origin. Received: ${path}`);
    }

    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid path')) {
      throw error;
    }
    throw new Error(`URL construction failed for base "${baseUrl}" and path "${path}"`);
  }
}
