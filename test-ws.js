const WebSocket = require('ws');

const ws = new WebSocket('wss://ws.pacifica.fi/ws');

ws.on('open', () => {
    console.log('Connected');
    
    // Testing symbols without USDC suffix to match SDK
    const subs = [
        { method: "subscribe", params: { source: "book", symbol: "SOL" } },
        { method: "subscribe", params: { source: "orderbook", symbol: "BTC" } },
        { method: "subscribe", params: { channel: "book", symbol: "SOL" } },
        { method: "subscribe", params: { source: "book", symbol: "SOL", agg_level: 1 } }
    ];

    subs.forEach(sub => {
        console.log('Sending:', JSON.stringify(sub));
        ws.send(JSON.stringify(sub));
    });

    setTimeout(() => {
        ws.close();
        process.exit(0);
    }, 5000);
});

ws.on('message', (data) => {
    console.log('Received:', data.toString().substring(0, 500));
});

ws.on('error', console.error);
