import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet') || '0x49674C3667DC0DaF6f3A9d7e21cD3db7a3db23db7';
  
  try {
    // Try different possible endpoints
    const endpoints = [
      `/wallet/${wallet}/balances`,
      `/wallets/${wallet}/balances`,
      `/address/${wallet}/balances`,
      `/account/${wallet}/balances`,
    ];
    
    const results: any = {};
    
    for (const endpoint of endpoints) {
      try {
        const url = `https://testnet-api.monorail.xyz/v1${endpoint}`;
        console.log(`Testing endpoint: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        const data = response.ok ? await response.json() : await response.text();
        
        results[endpoint] = {
          status: response.status,
          statusText: response.statusText,
          data: data
        };
      } catch (error) {
        results[endpoint] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      wallet,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}