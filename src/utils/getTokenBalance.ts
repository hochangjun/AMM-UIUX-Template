// Alternative method to get token balances directly from blockchain
export async function getTokenBalanceFromChain(
  provider: any,
  tokenAddress: string,
  walletAddress: string,
  decimals: number = 18
): Promise<string> {
  try {
    // For native token (MON)
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [walletAddress, 'latest']
      });
      const balanceInWei = parseInt(balance, 16);
      return (balanceInWei / Math.pow(10, decimals)).toString();
    }
    
    // For ERC20 tokens
    // balanceOf(address) method signature
    const data = `0x70a08231${walletAddress.slice(2).padStart(64, '0')}`;
    
    const result = await provider.request({
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data: data
      }, 'latest']
    });
    
    const balance = parseInt(result, 16);
    return (balance / Math.pow(10, decimals)).toString();
  } catch (error) {
    console.error('Error getting token balance from chain:', error);
    return '0';
  }
}