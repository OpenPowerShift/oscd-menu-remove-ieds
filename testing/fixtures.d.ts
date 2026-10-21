/**
 * Loads and parses an SCL document. Each call returns a new document because
 * specs apply edits to it.
 * @param url - the URL of the SCL file.
 * @returns the parsed document.
 */
export declare function loadScl(url: string): Promise<XMLDocument>;
/**
 * Loads a fixture from `test/fixtures`.
 * @param name - the file name within `test/fixtures`.
 * @returns the parsed document.
 */
export declare function loadFixture(name: string): Promise<XMLDocument>;
