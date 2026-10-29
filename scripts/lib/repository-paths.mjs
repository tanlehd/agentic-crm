// Resolve historical source references without rewriting signed/frozen evidence.
export function currentSourcePath(file) {
  if (file.startsWith('apps/backend/')) return 'services/core-baseline/' + file.slice('apps/backend/'.length);
  if (file.startsWith('services/workflow-core/')) return 'packages/workflow-definition/' + file.slice('services/workflow-core/'.length);
  return file;
}
