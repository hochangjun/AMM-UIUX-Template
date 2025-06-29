import { NextRequest, NextResponse } from 'next/server';

const PATHFINDER_BASE_URL = 'https://testnet-pathfinder.monorail.xyz/v3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract all parameters
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');
    const sender = searchParams.get('sender');
    
    if (!from || !to || !amount) {
      return NextResponse.json({ error: 'Missing required parameters: from, to, amount' }, { status: 400 });
    }
    
    // Build query string
    const params = new URLSearchParams({
      from,
      to,
      amount,
      max_slippage: searchParams.get('max_slippage') || '100',
      deadline: searchParams.get('deadline') || '60',
      max_hops: searchParams.get('max_hops') || '3',
      source: searchParams.get('source') || 'claude-swap'
    });
    
    if (sender) params.set('sender', sender);
    
    const url = `${PATHFINDER_BASE_URL}/quote?${params.toString()}`;
    console.log('🔗 Pathfinder API call:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pathfinder API error:', response.status, errorText);
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Pathfinder quote received');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Pathfinder proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}