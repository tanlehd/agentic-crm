import { ownerClient, ownerCommandClient, remoteRegistryAuthority, registryConfig, workloadMaterial, required, type ServiceName } from '@agentic-crm/workload-transport';

/** Lazy protocol clients; no baseline Chat storage or automatic retry. */
export function chatConnection(service: ServiceName) {
  return ownerConnection(service, 'chat', 'CHAT_OWNER_URL');
}

export function ownerConnection(service: ServiceName, target: ServiceName, endpoint: string) {
  let pending: Promise<{ read: ReturnType<typeof ownerClient>; command: ReturnType<typeof ownerCommandClient> }> | undefined;
  return async () => {
    if (!pending) pending = (async () => {
      const material = await workloadMaterial(service);
      const authority = remoteRegistryAuthority(material, await registryConfig());
      const url = new URL(required(process.env, endpoint));
      if (url.protocol !== (material.localHttp ? 'http:' : 'https:') || url.pathname !== '/' || url.username || url.password || url.search || url.hash) throw new Error('OWNER_URL_INVALID');
      return { read: ownerClient(material, authority, target, url), command: ownerCommandClient(material, authority, target, url) };
    })().catch(error => { pending = undefined; throw error; });
    return pending;
  };
}
