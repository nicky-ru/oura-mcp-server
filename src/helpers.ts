export function isGuid(str: string): boolean {
  if (!str) return false;

  // GUID/UUID pattern: 8-4-4-4-12 hexadecimal digits
  const guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidPattern.test(str);
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
