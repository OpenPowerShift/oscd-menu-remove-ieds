const fixtureCache = new Map<string, string>();

/**
 * Loads and parses an SCL document. Each call returns a new document because
 * specs apply edits to it.
 * @param url - the URL of the SCL file.
 * @returns the parsed document.
 */
export async function loadScl(url: string): Promise<XMLDocument> {
  let text = fixtureCache.get(url);
  if (text === undefined) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not load ${url}: ${response.status}`);
    }
    text = await response.text();
    fixtureCache.set(url, text);
  }
  return new DOMParser().parseFromString(text, 'application/xml');
}

/**
 * Loads a fixture from `test/fixtures`.
 * @param name - the file name within `test/fixtures`.
 * @returns the parsed document.
 */
export function loadFixture(name: string): Promise<XMLDocument> {
  return loadScl(`/test/fixtures/${name}`);
}
