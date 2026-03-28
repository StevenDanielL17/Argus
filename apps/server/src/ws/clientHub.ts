import type { WebSocket } from "@fastify/websocket";

interface Client {
  ws: WebSocket;
  isAlive: boolean;
  lastPing?: number;
}

const clients = new Map<WebSocket, Client>();

export function addClient(client: WebSocket): void {
  const clientData: Client = { ws: client, isAlive: true, lastPing: Date.now() };
  clients.set(client, clientData);

  client.on("close", () => {
    clients.delete(client);
  });

  client.on("message", (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === "ping") {
        // Respond with pong to keep connection alive
        client.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        clientData.isAlive = true;
        clientData.lastPing = Date.now();
      }
    } catch {
      // Ignore invalid messages
    }
  });
}

export function broadcast(payload: unknown): void {
  const data = JSON.stringify(payload);
  const deadClients: WebSocket[] = [];

  for (const [ws, clientData] of clients.entries()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
      clientData.isAlive = true;
    } else {
      deadClients.push(ws);
    }
  }

  // Clean up dead clients
  for (const ws of deadClients) {
    clients.delete(ws);
  }
}

export function clientCount(): number {
  return clients.size;
}

export function heartbeatCheck(intervalMs = 30000, timeoutMs = 15000): void {
  setInterval(() => {
    const now = Date.now();
    for (const [ws, clientData] of clients.entries()) {
      if (!clientData.isAlive || (clientData.lastPing && now - clientData.lastPing > timeoutMs)) {
        // Client is dead, terminate connection
        ws.terminate();
        clients.delete(ws);
        console.log(`[ClientHub] Terminated stale client`);
      } else {
        // Send ping to check if client is alive
        clientData.isAlive = false;
        try {
          ws.send(JSON.stringify({ type: "ping", timestamp: now }));
        } catch {
          clients.delete(ws);
        }
      }
    }
  }, intervalMs);
}
