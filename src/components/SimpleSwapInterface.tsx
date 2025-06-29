'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getTokenBalanceFromChain } from '@/utils/getTokenBalance';

// Simple token interface
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  usdPrice?: number;
}

// Simple API functions for Monorail using proxy
async function getMonUsdPrice(): Promise<number> {
  try {
    const response = await fetch('/api/monorail?endpoint=/symbol/MONUSD');
    if (!response.ok) return 1.0; // fallback
    const data = await response.json();
    const price = parseFloat(data.price) || 1.0;
    return isNaN(price) ? 1.0 : price;
  } catch (error) {
    console.warn('Failed to fetch MON price:', error);
    return 1.0; // fallback
  }
}

async function getTokenPrice(address: string, monUsdPrice: number): Promise<number> {
  if (address === '0x0000000000000000000000000000000000000000') {
    return monUsdPrice; // MON price
  }
  
  try {
    const response = await fetch(`/api/monorail?endpoint=/token/${address}`);
    if (!response.ok) return 0;
    const data = await response.json();
    return (data.mon_per_token || 0) * monUsdPrice;
  } catch (error) {
    console.warn(`Failed to fetch price for ${address}:`, error);
    return 0;
  }
}

async function getWalletBalances(walletAddress: string): Promise<Token[]> {
  try {
    // Try the wallet category endpoint first (more reliable)
    const categoryEndpoint = `/tokens/category/wallet?address=${walletAddress}&limit=100`;
    console.log('🔗 Fetching wallet balances for:', walletAddress);
    console.log('🌐 Using category endpoint:', categoryEndpoint);
    
    let response = await fetch(`/api/monorail?endpoint=${encodeURIComponent(categoryEndpoint)}`);
    console.log('📡 Category API Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      // Fallback to the original endpoint
      console.log('⚠️ Category endpoint failed, trying original balance endpoint...');
      const fallbackEndpoint = `/wallet/${walletAddress}/balances`;
      response = await fetch(`/api/monorail?endpoint=${encodeURIComponent(fallbackEndpoint)}`);
      console.log('📡 Fallback API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`❌ Both API endpoints failed: ${response.status} ${response.statusText}`, errorText);
        return [];
      }
    }
    
    const data = await response.json();
    console.log('📋 Raw API response:', JSON.stringify(data, null, 2));
    
    // Handle different possible response formats
    let tokens = [];
    if (Array.isArray(data)) {
      tokens = data;
    } else if (data.results && Array.isArray(data.results)) {
      tokens = data.results;
    } else if (data.balances && Array.isArray(data.balances)) {
      tokens = data.balances;
    } else if (data.tokens && Array.isArray(data.tokens)) {
      tokens = data.tokens;
    } else {
      console.warn('⚠️ Unexpected API response format:', typeof data, Object.keys(data));
    }
    
    console.log('🪙 Tokens from response:', tokens.length);
    
    const mappedTokens = tokens.map((token: any) => {
      // Log each token to debug balance field
      console.log('🔍 Token data:', {
        address: token.address,
        symbol: token.symbol,
        balance: token.balance,
        amount: token.amount,
        value: token.value,
        formatted_balance: token.formatted_balance
      });
      
      return {
        address: token.address || token.token_address || '',
        symbol: token.symbol || token.token_symbol || '',
        name: token.name || token.token_name || '',
        decimals: parseInt(token.decimals || token.token_decimals || '18'),
        balance: token.balance || token.amount || token.value || token.formatted_balance || '0'
      };
    });
    
    console.log('🗂️ Mapped tokens:', mappedTokens);
    
    // If no tokens returned, add default MON and USDC with 0 balance for testing
    if (mappedTokens.length === 0) {
      console.warn('⚠️ No tokens returned from API, using defaults');
      return [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'MON', name: 'Monad', decimals: 18, balance: '0' },
        { address: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea', symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '0' }
      ];
    }
    
    return mappedTokens;
  } catch (error) {
    console.error('❌ Failed to fetch wallet balances:', error);
    // Return default tokens on error
    return [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'MON', name: 'Monad', decimals: 18, balance: '0' },
      { address: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea', symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '0' }
    ];
  }
}

export function SimpleSwapInterface() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [verifiedTokenAddresses, setVerifiedTokenAddresses] = useState<Set<string>>(new Set());
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromMode, setFromMode] = useState<'token' | 'usd'>('token');
  const [toMode, setToMode] = useState<'token' | 'usd'>('token');
  const [monUsdPrice, setMonUsdPrice] = useState<number>(1.0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string | React.ReactNode} | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<'from' | 'to'>('from');
  const [approving, setApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  const wallet = wallets[0];

  // Notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string | React.ReactNode) => {
    setNotification({ type, message });
    // Notifications stay visible until manually closed for debugging
  };

  // Quote fetching function
  const fetchQuote = async (fromToken: Token, toToken: Token, amount: string, isFromAmount: boolean = true) => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    try {
      setQuoteLoading(true);
      const fromAddress = fromToken.address;
      const toAddress = toToken.address;
      
      // Convert amount to token amount if in USD mode
      let tokenAmount = amount;
      if (isFromAmount && fromMode === 'usd' && fromToken.usdPrice) {
        tokenAmount = (parseFloat(amount) / fromToken.usdPrice).toString();
      } else if (!isFromAmount && toMode === 'usd' && toToken.usdPrice) {
        tokenAmount = (parseFloat(amount) / toToken.usdPrice).toString();
      }
      
      // Pathfinder API expects decimal format, not wei
      const apiAmount = parseFloat(tokenAmount).toString();
      
      const response = await fetch(`/api/pathfinder?from=${fromAddress}&to=${toAddress}&amount=${apiAmount}&sender=${wallet?.address || ''}`);
      
      if (!response.ok) {
        throw new Error(`Quote failed: ${response.status}`);
      }
      
      const quoteData = await response.json();
      console.log('🔍 Pathfinder API Response:', quoteData);
      
      if (quoteData.output_formatted || quoteData.output) {
        // Use formatted output if available, otherwise parse raw output
        const outputAmount = quoteData.output_formatted 
          ? parseFloat(quoteData.output_formatted)
          : parseFloat(quoteData.output);
        
        console.log('📊 Output Amount:', { 
          raw: quoteData.output, 
          formatted: quoteData.output_formatted, 
          parsed: outputAmount 
        });
        
        if (isFromAmount) {
          // Set toAmount based on toMode
          const displayAmount = toMode === 'usd' && toToken.usdPrice 
            ? formatSignificantFigures(outputAmount * toToken.usdPrice, 4)
            : formatSignificantFigures(outputAmount, 4);
          setToAmount(displayAmount);
        } else {
          // Set fromAmount based on fromMode  
          const displayAmount = fromMode === 'usd' && fromToken.usdPrice
            ? formatSignificantFigures(outputAmount * fromToken.usdPrice, 4)
            : formatSignificantFigures(outputAmount, 4);
          setFromAmount(displayAmount);
        }
      }
    } catch (error) {
      console.error('Quote fetch error:', error);
      showNotification('error', 'Failed to fetch quote. Please try again.');
    } finally {
      setQuoteLoading(false);
    }
  };

  // Debounced quote fetching
  useEffect(() => {
    if (!fromToken || !toToken || !fromAmount || lastEditedField !== 'from') return;
    
    const timeoutId = setTimeout(() => {
      fetchQuote(fromToken, toToken, fromAmount, true);
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [fromAmount, fromToken, toToken, lastEditedField]);

  useEffect(() => {
    if (!fromToken || !toToken || !toAmount || lastEditedField !== 'to') return;
    
    const timeoutId = setTimeout(() => {
      fetchQuote(toToken, fromToken, toAmount, false);
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [toAmount, fromToken, toToken, lastEditedField]);

  // Handle mode changes - convert displayed values when toggling USD/TOKEN
  useEffect(() => {
    if (!fromAmount || !fromToken?.usdPrice) return;
    // Don't trigger if user just changed the input
    if (lastEditedField === 'from') return;
    
    // Convert the existing amount when mode changes
    const currentTokenAmount = fromMode === 'usd' 
      ? parseFloat(fromAmount) / fromToken.usdPrice
      : parseFloat(fromAmount);
    
    const newDisplayAmount = fromMode === 'usd'
      ? formatSignificantFigures(currentTokenAmount * fromToken.usdPrice, 4)
      : formatSignificantFigures(currentTokenAmount, 4);
    
    if (newDisplayAmount !== fromAmount) {
      setFromAmount(newDisplayAmount);
    }
  }, [fromMode, fromToken?.usdPrice]);

  useEffect(() => {
    if (!toAmount || !toToken?.usdPrice) return;
    // Don't trigger if user just changed the input
    if (lastEditedField === 'to') return;
    
    // Convert the existing amount when mode changes
    const currentTokenAmount = toMode === 'usd' 
      ? parseFloat(toAmount) / toToken.usdPrice
      : parseFloat(toAmount);
    
    const newDisplayAmount = toMode === 'usd'
      ? formatSignificantFigures(currentTokenAmount * toToken.usdPrice, 4)
      : formatSignificantFigures(currentTokenAmount, 4);
    
    if (newDisplayAmount !== toAmount) {
      setToAmount(newDisplayAmount);
    }
  }, [toMode, toToken?.usdPrice]);

  // Check if token approval is needed
  const checkApproval = async (tokenAddress: string, spender: string, amount: string): Promise<boolean> => {
    try {
      const provider = await wallet.getEthereumProvider();
      
      // ERC20 allowance call
      const allowanceCall = {
        to: tokenAddress,
        data: `0xdd62ed3e${wallet.address.slice(2).padStart(64, '0')}${spender.slice(2).padStart(64, '0')}`
      };
      
      const allowanceHex = await provider.request({
        method: 'eth_call',
        params: [allowanceCall, 'latest']
      });
      
      const allowance = parseInt(allowanceHex, 16);
      const requiredAmount = parseFloat(amount) * Math.pow(10, fromToken?.decimals || 18);
      
      return allowance >= requiredAmount;
    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  };

  // Approve token spending
  const approveToken = async (tokenAddress: string, spender: string, amount: string) => {
    try {
      setApproving(true);
      showNotification('info', 'Approving token spending...');
      
      const provider = await wallet.getEthereumProvider();
      const rawAmount = (parseFloat(amount) * Math.pow(10, fromToken?.decimals || 18)).toString(16);
      
      // ERC20 approve call
      const txResponse = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          to: tokenAddress,
          data: `0x095ea7b3${spender.slice(2).padStart(64, '0')}${rawAmount.padStart(64, '0')}`,
          from: wallet.address
        }]
      });

      showNotification('info', 'Approval transaction submitted. Waiting for confirmation...');
      
      // Wait for approval confirmation
      let receipt = null;
      let attempts = 0;
      while (!receipt && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txResponse]
        });
        attempts++;
      }
      
      if (receipt && receipt.status === '0x1') {
        showNotification('success', 'Token approval confirmed! Executing swap...');
        setNeedsApproval(false);
        // Auto-execute swap after approval
        executeSwap();
      } else {
        throw new Error('Approval transaction failed');
      }
      
    } catch (error: any) {
      console.error('Approval error:', error);
      showNotification('error', `Approval failed: ${error.message}`);
    } finally {
      setApproving(false);
    }
  };

  // Swap execution function
  const executeSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || !wallet?.address) {
      showNotification('error', 'Missing required swap parameters');
      return;
    }

    try {
      setLoading(true);
      showNotification('info', 'Preparing swap transaction...');

      // Get fresh quote for the swap
      const fromAddress = fromToken.address;
      const toAddress = toToken.address;
      
      // Convert to token amount if in USD mode
      let tokenAmount = fromAmount;
      if (fromMode === 'usd' && fromToken.usdPrice) {
        tokenAmount = (parseFloat(fromAmount) / fromToken.usdPrice).toString();
      }
      
      const apiAmount = parseFloat(tokenAmount).toString();

      const response = await fetch(`/api/pathfinder?from=${fromAddress}&to=${toAddress}&amount=${apiAmount}&sender=${wallet.address}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get swap quote: ${response.status} - ${errorText}`);
      }
      
      const quoteData = await response.json();
      
      if (!quoteData.transaction) {
        throw new Error('Invalid swap quote received - no transaction data');
      }

      const txRequest = quoteData.transaction;
      
      // Check if we need approval first (for ERC20 tokens)
      if (fromAddress !== '0x0000000000000000000000000000000000000000') {
        const hasApproval = await checkApproval(fromAddress, txRequest.to, tokenAmount);
        if (!hasApproval) {
          setNeedsApproval(true);
          setLoading(false);
          await approveToken(fromAddress, txRequest.to, tokenAmount);
          return; // Exit here - approveToken will call executeSwap again
        }
      }
      
      showNotification('info', 'Please confirm the swap transaction in your wallet...');
      
      // Use Privy's wallet interface
      const provider = await wallet.getEthereumProvider();
      const txResponse = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          to: txRequest.to,
          data: txRequest.data,
          value: txRequest.value || '0x0',
          from: wallet.address
        }]
      });

      showNotification('info', 'Swap transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction confirmation  
      let receipt = null;
      let attempts = 0;
      while (!receipt && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txResponse]
        });
        attempts++;
      }
      
      if (receipt && receipt.status === '0x1') {
        showNotification('success', `Swap completed! Transaction: ${txResponse.slice(0, 10)}...`);
        // Reset form
        setFromAmount('');
        setToAmount('');
        setNeedsApproval(false);
        // Show success toast with transaction link
        const successMessage = (
          <span>
            Swap completed! {' '}
            <a 
              href={`https://testnet.monadexplorer.com/tx/${txResponse}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-700 font-medium"
              onClick={(e) => e.stopPropagation()} // Prevent notification from closing
            >
              View transaction
            </a>
          </span>
        );
        showNotification('success', successMessage);
        
        // Refresh balances after successful swap
        setTimeout(async () => {
          if (wallet?.address) {
            try {
              console.log('🔄 Refreshing balances after swap...');
              const updatedTokens = await getWalletBalances(wallet.address);
              const tokensWithPrices = await Promise.all(
                updatedTokens.map(async (token) => ({
                  ...token,
                  usdPrice: await getTokenPrice(token.address, monUsdPrice)
                }))
              );
              setAvailableTokens(tokensWithPrices);
              
              // Update current token references with new balances
              const updatedFromToken = tokensWithPrices.find(t => t.address === fromToken?.address);
              const updatedToToken = tokensWithPrices.find(t => t.address === toToken?.address);
              if (updatedFromToken) setFromToken(updatedFromToken);
              if (updatedToToken) setToToken(updatedToToken);
              
              console.log('✅ Balances refreshed successfully');
            } catch (error) {
              console.error('Failed to refresh balances:', error);
              // Fallback: just fetch wallet balances without prices
              try {
                const basicTokens = await getWalletBalances(wallet.address);
                setAvailableTokens(basicTokens.map(token => ({ ...token, usdPrice: token.usdPrice || 0 })));
              } catch (fallbackError) {
                console.error('Fallback balance refresh also failed:', fallbackError);
              }
            }
          }
        }, 0);
      } else {
        throw new Error(`Transaction failed - Status: ${receipt?.status || 'unknown'}`);
      }
      
    } catch (error: any) {
      console.error('Swap execution error:', error);
      const errorDetails = {
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack
      };
      console.error('Full error details:', errorDetails);
      
      if (error.message.includes('user rejected') || error.code === 4001) {
        showNotification('error', 'Transaction cancelled by user');
      } else {
        showNotification('error', `Swap failed: ${error.message} (Code: ${error.code || 'unknown'})`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load wallet tokens and prices
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('🔄 Loading data...', { ready, authenticated, walletAddress: wallet?.address });
        
        // Get MON USD price
        const monPrice = await getMonUsdPrice();
        const validMonPrice = typeof monPrice === 'number' && !isNaN(monPrice) ? monPrice : 1.0;
        setMonUsdPrice(validMonPrice);
        console.log('💰 MON USD Price:', validMonPrice);

        // Get verified tokens from API
        let verifiedTokens: Token[] = [];
        try {
          console.log('🔍 Fetching verified tokens from API...');
          const verifiedResponse = await fetch('/api/monorail?endpoint=/tokens/category/verified');
          if (verifiedResponse.ok) {
            const verifiedData = await verifiedResponse.json();
            console.log('📋 Verified tokens API response:', verifiedData);
            
            const tokens = Array.isArray(verifiedData) ? verifiedData : (verifiedData.results || []);
            verifiedTokens = tokens.map((token: any) => ({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: parseInt(token.decimals),
              balance: '0'
            }));
            
            setVerifiedTokenAddresses(new Set(verifiedTokens.map(t => t.address.toLowerCase())));
            console.log('✅ Verified tokens loaded:', verifiedTokens.length);
          } else {
            console.warn('❌ Failed to fetch verified tokens, using fallback');
            verifiedTokens = [
              { address: '0x0000000000000000000000000000000000000000', symbol: 'MON', name: 'Monad', decimals: 18, balance: '0' },
              { address: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea', symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '0' }
            ];
            setVerifiedTokenAddresses(new Set(verifiedTokens.map(t => t.address.toLowerCase())));
          }
        } catch (error) {
          console.error('❌ Error fetching verified tokens:', error);
          verifiedTokens = [
            { address: '0x0000000000000000000000000000000000000000', symbol: 'MON', name: 'Monad', decimals: 18, balance: '0' },
            { address: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea', symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '0' }
          ];
          setVerifiedTokenAddresses(new Set(verifiedTokens.map(t => t.address.toLowerCase())));
        }

        // Get wallet balances (if wallet connected)
        let walletTokens: Token[] = [];
        if (authenticated && wallet?.address) {
          console.log('🔍 Loading wallet tokens for:', wallet.address);
          walletTokens = await getWalletBalances(wallet.address);
          console.log('📊 Wallet tokens from API:', walletTokens);
          
          // If API returns no balances or empty balances, try fetching from blockchain
          const hasNonZeroBalance = walletTokens.some(t => parseFloat(t.balance || '0') > 0);
          if (!hasNonZeroBalance && wallet) {
            console.log('⚡ API returned no balances, trying blockchain method...');
            try {
              const provider = await wallet.getEthereumProvider();
              
              // Update balances for verified tokens using blockchain
              for (const token of verifiedTokens) {
                const balance = await getTokenBalanceFromChain(
                  provider,
                  token.address,
                  wallet.address,
                  token.decimals
                );
                
                if (parseFloat(balance) > 0) {
                  console.log(`✅ Found balance for ${token.symbol}: ${balance}`);
                  const existingIndex = walletTokens.findIndex(t => 
                    t.address.toLowerCase() === token.address.toLowerCase()
                  );
                  
                  if (existingIndex >= 0) {
                    walletTokens[existingIndex].balance = balance;
                  } else {
                    walletTokens.push({ ...token, balance });
                  }
                }
              }
            } catch (error) {
              console.error('Failed to fetch balances from blockchain:', error);
            }
          }
        }
        
        // Start with verified tokens, then add wallet tokens
        const allTokens = [...verifiedTokens];
        
        // Update with wallet balances
        for (const walletToken of walletTokens) {
          const existingIndex = allTokens.findIndex(t => 
            t.address.toLowerCase() === walletToken.address.toLowerCase()
          );
          
          if (existingIndex >= 0) {
            allTokens[existingIndex] = { ...allTokens[existingIndex], balance: walletToken.balance };
          } else {
            allTokens.push(walletToken);
          }
        }
        
        // Get prices for all tokens
        const tokensWithPrices = await Promise.all(
          allTokens.map(async (token) => {
            const usdPrice = await getTokenPrice(token.address, validMonPrice);
            return { ...token, usdPrice };
          })
        );

        console.log('📊 Final tokens with prices and balances:', tokensWithPrices);
        setAvailableTokens(tokensWithPrices);
        
        // Set default tokens: MON -> USDC if none selected
        if (!fromToken && tokensWithPrices.length > 0) {
          const monToken = tokensWithPrices.find(t => t.symbol === 'MON');
          setFromToken(monToken || tokensWithPrices[0]);
        }
        if (!toToken && tokensWithPrices.length > 0) {
          const usdcToken = tokensWithPrices.find(t => t.symbol === 'USDC');
          const fallbackToken = tokensWithPrices.find(t => t.symbol !== fromToken?.symbol);
          setToToken(usdcToken || fallbackToken || tokensWithPrices[0]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (ready) {
      loadData();
    }
  }, [ready, authenticated, wallet?.address]);

  // USD conversion helpers
  const getTokenValue = (amount: string, token: Token | null): string => {
    if (!amount || !token?.usdPrice) return '';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '';
    return (numAmount * token.usdPrice).toFixed(2);
  };

  const getUsdValue = (amount: string, token: Token | null): string => {
    if (!amount || !token?.usdPrice) return '';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '';
    return formatSignificantFigures(numAmount / token.usdPrice, 4);
  };

  // Format number to significant figures
  const formatSignificantFigures = (num: number, sigFigs: number): string => {
    if (num === 0) return '0';
    const magnitude = Math.floor(Math.log10(Math.abs(num)));
    const factor = Math.pow(10, sigFigs - 1 - magnitude);
    return (Math.round(num * factor) / factor).toString();
  };

  if (!ready || !mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg border-l-4 ${
          notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
          'bg-blue-50 border-blue-400 text-blue-800'
        } shadow-sm`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' && (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <div className="text-sm font-medium">{notification.message}</div>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Swap</h1>
          <div className="flex items-center space-x-3">
            {authenticated && wallet ? (
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-600">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4 text-gray-500">
            Loading wallet data...
          </div>
        )}

        {/* Wallet Not Connected State */}
        {!authenticated && !loading && (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-sm">Connect your wallet to see token balances and start trading</p>
          </div>
        )}

        {/* From Token */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">You pay</span>
            {fromToken && (
              <button
                onClick={() => {
                  if (fromToken.balance && parseFloat(fromToken.balance) > 0) {
                    setFromAmount(fromToken.balance);
                    setFromMode('token');
                  }
                }}
                disabled={!fromToken.balance || parseFloat(fromToken.balance) === 0}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Balance: {fromToken.balance ? parseFloat(fromToken.balance).toFixed(4) : '0.0000'} {fromToken.symbol}
              </button>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 bg-gray-200 hover:bg-gray-250 rounded-lg px-3 py-2 cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {fromToken?.symbol.charAt(0) || '?'}
                </div>
                <select 
                  value={fromToken?.address || ''}
                  onChange={(e) => {
                    const token = availableTokens.find(t => t.address === e.target.value);
                    setFromToken(token || null);
                  }}
                  className="bg-transparent border-none outline-none font-semibold text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="">Select token</option>
                  {(() => {
                    const verifiedTokens = availableTokens.filter(token => 
                      verifiedTokenAddresses.has(token.address.toLowerCase())
                    );
                    const unverifiedTokens = availableTokens.filter(token => 
                      !verifiedTokenAddresses.has(token.address.toLowerCase())
                    );
                    
                    const sortTokens = (tokens: typeof availableTokens) => tokens.sort((a, b) => {
                      const aBalance = parseFloat(a.balance || '0');
                      const bBalance = parseFloat(b.balance || '0');
                      
                      if (aBalance !== bBalance) {
                        return bBalance - aBalance;
                      }
                      
                      return a.symbol.localeCompare(b.symbol);
                    });
                    
                    const renderTokenOptions = (tokens: typeof availableTokens) => tokens.map(token => {
                      const balance = parseFloat(token.balance || '0');
                      const usdValue = balance * (token.usdPrice || 0);
                      const displayText = balance > 0 
                        ? `${token.symbol} - ${balance.toFixed(4)} ($${usdValue.toFixed(2)})`
                        : token.symbol;
                      
                      return (
                        <option key={token.address} value={token.address}>
                          {displayText}
                        </option>
                      );
                    });
                    
                    return (
                      <>
                        {verifiedTokens.length > 0 && (
                          <optgroup label="✓ Verified Tokens">
                            {renderTokenOptions(sortTokens(verifiedTokens))}
                          </optgroup>
                        )}
                        {unverifiedTokens.length > 0 && (
                          <optgroup label="⚠ Unverified Tokens">
                            {renderTokenOptions(sortTokens(unverifiedTokens))}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
              </div>
            </div>
            
            <div className="relative w-full text-right">
              <input
                type="text"
                value={fromMode === 'usd' && fromAmount ? `$${fromAmount}` : fromAmount}
                onChange={(e) => {
                  const value = e.target.value.replace('$', '');
                  setFromAmount(value);
                  setLastEditedField('from');
                }}
                placeholder={fromMode === 'usd' ? '$0' : '0'}
                className="w-full text-right text-3xl font-semibold bg-transparent border-none outline-none placeholder-gray-400 text-gray-900"
              />
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <div></div>
              <div className="flex items-center space-x-3">
                {fromAmount && fromToken && (
                  <div className="text-lg text-gray-500">
                    {fromMode === 'token' 
                      ? `$${getTokenValue(fromAmount, fromToken)}`
                      : `${getUsdValue(fromAmount, fromToken)} ${fromToken.symbol}`
                    }
                  </div>
                )}
                <button
                  onClick={() => {
                    const newMode = fromMode === 'token' ? 'usd' : 'token';
                    setFromMode(newMode);
                    
                    // Convert the current amount to the new mode
                    if (fromAmount && fromToken?.usdPrice) {
                      const currentValue = parseFloat(fromAmount);
                      if (newMode === 'usd') {
                        // Converting from token to USD
                        const usdValue = currentValue * fromToken.usdPrice;
                        setFromAmount(formatSignificantFigures(usdValue, 4));
                      } else {
                        // Converting from USD to token
                        const tokenValue = currentValue / fromToken.usdPrice;
                        setFromAmount(formatSignificantFigures(tokenValue, 4));
                      }
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title={`Switch to ${fromMode === 'token' ? 'USD' : 'TOKEN'} mode`}
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            type="button"
            onClick={() => {
              setFromToken(toToken);
              setToToken(fromToken);
              setFromAmount(toAmount);
              setToAmount(fromAmount);
            }}
            className="p-2 bg-white rounded-xl border-4 border-gray-50 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">You receive</span>
            {toToken && (
              <span className="text-sm text-gray-500">
                Balance: {toToken.balance ? parseFloat(toToken.balance).toFixed(4) : '0.0000'} {toToken.symbol}
              </span>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 bg-gray-200 hover:bg-gray-250 rounded-lg px-3 py-2 cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  {toToken?.symbol.charAt(0) || '?'}
                </div>
                <select 
                  value={toToken?.address || ''}
                  onChange={(e) => {
                    const token = availableTokens.find(t => t.address === e.target.value);
                    setToToken(token || null);
                  }}
                  className="bg-transparent border-none outline-none font-semibold text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="">Select token</option>
                  {(() => {
                    const verifiedTokens = availableTokens.filter(token => 
                      verifiedTokenAddresses.has(token.address.toLowerCase())
                    );
                    const unverifiedTokens = availableTokens.filter(token => 
                      !verifiedTokenAddresses.has(token.address.toLowerCase())
                    );
                    
                    const sortTokens = (tokens: typeof availableTokens) => tokens.sort((a, b) => {
                      const aBalance = parseFloat(a.balance || '0');
                      const bBalance = parseFloat(b.balance || '0');
                      
                      if (aBalance !== bBalance) {
                        return bBalance - aBalance;
                      }
                      
                      return a.symbol.localeCompare(b.symbol);
                    });
                    
                    const renderTokenOptions = (tokens: typeof availableTokens) => tokens.map(token => {
                      const balance = parseFloat(token.balance || '0');
                      const usdValue = balance * (token.usdPrice || 0);
                      const displayText = balance > 0 
                        ? `${token.symbol} - ${balance.toFixed(4)} ($${usdValue.toFixed(2)})`
                        : token.symbol;
                      
                      return (
                        <option key={token.address} value={token.address}>
                          {displayText}
                        </option>
                      );
                    });
                    
                    return (
                      <>
                        {verifiedTokens.length > 0 && (
                          <optgroup label="✓ Verified Tokens">
                            {renderTokenOptions(sortTokens(verifiedTokens))}
                          </optgroup>
                        )}
                        {unverifiedTokens.length > 0 && (
                          <optgroup label="⚠ Unverified Tokens">
                            {renderTokenOptions(sortTokens(unverifiedTokens))}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
              </div>
            </div>
            
            <div className="relative w-full text-right">
              <input
                type="text"
                value={toMode === 'usd' && toAmount ? `$${toAmount}` : toAmount}
                onChange={(e) => {
                  const value = e.target.value.replace('$', '');
                  setToAmount(value);
                  setLastEditedField('to');
                }}
                placeholder={toMode === 'usd' ? '$0' : '0'}
                className="w-full text-right text-3xl font-semibold bg-transparent border-none outline-none placeholder-gray-400 text-gray-900"
              />
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <div></div>
              <div className="flex items-center space-x-3">
                {toAmount && toToken && (
                  <div className="text-lg text-gray-500">
                    {toMode === 'token' 
                      ? `$${getTokenValue(toAmount, toToken)}`
                      : `${getUsdValue(toAmount, toToken)} ${toToken.symbol}`
                    }
                  </div>
                )}
                <button
                  onClick={() => {
                    const newMode = toMode === 'token' ? 'usd' : 'token';
                    setToMode(newMode);
                    
                    // Convert the current amount to the new mode
                    if (toAmount && toToken?.usdPrice) {
                      const currentValue = parseFloat(toAmount);
                      if (newMode === 'usd') {
                        // Converting from token to USD
                        const usdValue = currentValue * toToken.usdPrice;
                        setToAmount(formatSignificantFigures(usdValue, 4));
                      } else {
                        // Converting from USD to token
                        const tokenValue = currentValue / toToken.usdPrice;
                        setToAmount(formatSignificantFigures(tokenValue, 4));
                      }
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title={`Switch to ${toMode === 'token' ? 'USD' : 'TOKEN'} mode`}
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <button
          disabled={!fromToken || !toToken || !fromAmount || loading || quoteLoading || approving}
          onClick={executeSwap}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl transition-colors"
        >
          {approving ? 'Approving...' :
           loading ? 'Processing...' : 
           quoteLoading ? 'Getting quote...' :
           !fromToken || !toToken ? 'Select tokens' : 
           !fromAmount ? 'Enter amount' : 
           needsApproval ? 'Approve & Swap' : 'Swap'}
        </button>

        {/* Connected Wallet Info */}
        {wallet && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Connected: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            {monUsdPrice > 0 && <span className="ml-2">| MON: ${typeof monUsdPrice === 'number' ? monUsdPrice.toFixed(4) : '1.0000'}</span>}
          </div>
        )}
      </div>
    </div>
  );
}