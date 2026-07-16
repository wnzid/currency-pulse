export function publicAssetPath(relativePath: string): string {
  const normalizedPath = relativePath.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}
