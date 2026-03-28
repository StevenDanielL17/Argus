import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, side, type, quantity, price } = body;

    // Validate required fields
    if (!symbol || !side || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, side, quantity" },
        { status: 400 }
      );
    }

    // Forward to backend execution endpoint
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_REST ?? "http://localhost:8080";
    const response = await fetch(`${backendUrl}/api/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol, side, type, quantity, price }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Execution failed: ${message}` }, { status: 500 });
  }
}
