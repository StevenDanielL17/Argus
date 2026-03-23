import type { WebSocket } from "@fastify/websocket";

const clients = new Set<WebSocket>();

export function addClient(client: WebSocket): void {
  clients.add(client);
  client.on("close", () => clients.delete(client));
}

export function broadcast(payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
