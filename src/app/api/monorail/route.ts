import { NextRequest, NextResponse } from 'next/server';

const MONORAIL_BASE_URL = 'https://testnet-api.monorail.xyz/v1';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    // Construct the full URL
    const url = `${MONORAIL_BASE_URL}${endpoint}`;
    console.log('📡 Proxying request to:', url);
    
    // Log wallet balance requests specifically
    if (endpoint.includes('/wallet/') && endpoint.includes('/balances')) {
      const walletMatch = endpoint.match(/\/wallet\/(0x[a-fA-F0-9]{40})\/balances/);
      if (walletMatch) {
        console.log('💰 Fetching balances for wallet:', walletMatch[1]);
      }
    }
    
    // Forward the request to Monorail API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ Monorail API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error details:', errorText);
      return NextResponse.json(
        { error: `API error: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Monorail API response received, size:', JSON.stringify(data).length);
    
    // Log wallet balance responses specifically
    if (endpoint.includes('/wallet/') && endpoint.includes('/balances')) {
      console.log('💰 Wallet balance response:', JSON.stringify(data).substring(0, 500) + '...');
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}