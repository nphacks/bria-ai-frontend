// Map of project names to their JSON file path (relative to the public root).
// We use fetch() instead of import statements to support browser-native ESM execution.
export const PROJECT_URLS: Record<string, string> = {
  "Wonka": "/scripts/Wonka.json",
  "Barbie": "/scripts/Barbie.json"
};
