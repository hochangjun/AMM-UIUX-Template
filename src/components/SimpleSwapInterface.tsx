'use client';

/**
 * AMM DEX Swap Interface - Modern UI/UX Template
 * 
 * This component implements all the modern AMM UI/UX best practices including:
 * - USD/Token input toggles for user-friendly pricing
 * - Balance shortcuts (25%, 50%, MAX) for quick selection
 * - Enhanced token selector with search and copy addresses
 * - Live quote refresh with countdown timer
 * - Reactive slippage settings based on price impact
 * - Shareable swap URLs via query parameters
 * - Professional success modals and error handling
 * 
 * Teams can adapt this template by:
 * 1. Replacing Privy wallet integration with their preferred wallet library
 * 2. Updating API endpoints to match their backend
 * 3. Modifying token list sources and verification logic
 * 4. Customizing styling to match their brand
 */

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth'; // Replace with your wallet library
import { getTokenBalanceFromChain } from '@/utils/getTokenBalance';
import { TokenSelector } from './TokenSelector';
import { useSearchParams } from 'next/navigation';

/**
 * Token Interface
 * 
 * Standard token object structure used throughout the application.
 * Teams should modify this to match their token data structure.
 */
interface Token {
 address: string;    // Contract address (use '0x0000...' for native token)
 symbol: string;     // Token symbol (e.g., 'ETH', 'USDC')
 name: string;       // Full token name (e.g., 'Ethereum', 'USD Coin')
 decimals: number;   // Token decimal places (usually 18 for ERC20)
 balance?: string;   // User's token balance (formatted string)
 usdPrice?: number;  // USD price per token (for USD toggle feature)
}

/**
 * PRICE FETCHING FUNCTIONS
 * 
 * These functions handle price data from your DEX API.
 * Teams should replace these with their own price endpoints.
 */

/**
 * Get native token USD price
 * 
 * Replace this function to fetch your native token price from your API.
 * The example uses Monorail API - adapt the endpoint and response parsing.
 */
async function getMonUsdPrice(): Promise<number> {
 // Check cache first
 const cachedPrice = getCachedPrice('MON_USD_PRICE');
 if (cachedPrice !== null) {
  return cachedPrice;
 }
 
 try {
  const response = await fetch('/api/monorail?endpoint=/symbol/MONUSD');
  if (!response.ok) return 1.0; // fallback
  const data = await response.json();
  const price = parseFloat(data.price) || 1.0;
  const validPrice = isNaN(price) ? 1.0 : price;
  
  // Cache MON price for 2 minutes (more frequent updates)
  setCachedPrice('MON_USD_PRICE', validPrice);
  console.log(`🌐 Fetched and cached MON USD price: ${validPrice}`);
  
  return validPrice;
 } catch (error) {
  console.warn('Failed to fetch MON price:', error);
  return 1.0; // fallback
 }
}

/**
 * CACHING CONFIGURATION
 * 
 * Caching improves performance and reduces API calls.
 * Teams can adjust cache durations based on their needs:
 * - Price cache: 5 minutes (prices change slowly)
 * - Balance cache: 30 seconds (balances change frequently)
 */
const PRICE_CACHE_KEY = 'monorail_token_prices';    // Update key prefix for your DEX
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const BALANCE_CACHE_KEY = 'monorail_wallet_balances'; // Update key prefix for your DEX
const BALANCE_CACHE_DURATION = 30 * 1000; // 30 seconds

/**
 * Get cached token price
 * 
 * This caching system prevents excessive API calls for price data.
 * Teams can keep this implementation as-is.
 */
function getCachedPrice(address: string): number | null {
 try {
  const cached = localStorage.getItem(PRICE_CACHE_KEY);
  if (!cached) return null;
  
  const cache = JSON.parse(cached);
  const tokenCache = cache[address];
  if (!tokenCache) return null;
  
  const isExpired = Date.now() - tokenCache.timestamp > PRICE_CACHE_DURATION;
  if (isExpired) return null;
  
  console.log(`💾 Using cached price for ${address}: ${tokenCache.price}`);
  return tokenCache.price;
 } catch (error) {
  console.warn('Failed to read price cache:', error);
  return null;
 }
}

/**
 * Cache token price with timestamp
 * 
 * Stores price data in localStorage with expiration.
 * Teams can keep this implementation as-is.
 */
function setCachedPrice(address: string, price: number): void {
 try {
  const cached = localStorage.getItem(PRICE_CACHE_KEY);
  const cache = cached ? JSON.parse(cached) : {};
  
  cache[address] = {
   price,
   timestamp: Date.now()
  };
  
  localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
 } catch (error) {
  console.warn('Failed to cache price:', error);
 }
}

function getCachedBalances(walletAddress: string): Token[] | null {
 try {
  const cached = localStorage.getItem(BALANCE_CACHE_KEY);
  if (!cached) return null;
  
  const cache = JSON.parse(cached);
  const walletCache = cache[walletAddress.toLowerCase()];
  if (!walletCache) return null;
  
  const isExpired = Date.now() - walletCache.timestamp > BALANCE_CACHE_DURATION;
  if (isExpired) return null;
  
  console.log(`💾 Using cached balances for ${walletAddress}`);
  return walletCache.balances;
 } catch (error) {
  console.warn('Failed to read balance cache:', error);
  return null;
 }
}

function setCachedBalances(walletAddress: string, balances: Token[]): void {
 try {
  const cached = localStorage.getItem(BALANCE_CACHE_KEY);
  const cache = cached ? JSON.parse(cached) : {};
  
  cache[walletAddress.toLowerCase()] = {
   balances,
   timestamp: Date.now()
  };
  
  localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(cache));
 } catch (error) {
  console.warn('Failed to cache balances:', error);
 }
}

/**
 * Get token price in USD
 * 
 * Fetches token price from your DEX API. Teams should:
 * 1. Replace the API endpoint with your price endpoint
 * 2. Update the response parsing logic
 * 3. Modify the native token address check ('0x0000...')
 */
async function getTokenPrice(address: string, monUsdPrice: number): Promise<number> {
 if (address === '0x0000000000000000000000000000000000000000') {
  return monUsdPrice; // MON price
 }
 
 // Check cache first
 const cachedPrice = getCachedPrice(address);
 if (cachedPrice !== null) {
  return cachedPrice;
 }
 
 try {
  const response = await fetch(`/api/monorail?endpoint=/token/${address}`);
  if (!response.ok) return 0;
  const data = await response.json();
  
  // Fix: mon_per_token means "how many MON to buy 1 token"
  // So if USDC costs 0.5 MON, and MON is $2, then USDC = $1
  // Formula: price_in_usd = (1 / mon_per_token) * monUsdPrice
  const monPerToken = data.mon_per_token || 0;
  const price = monPerToken > 0 ? monUsdPrice / monPerToken : 0;
  
  // Cache the result
  setCachedPrice(address, price);
  console.log(`🌐 Fetched and cached price for ${address}: ${price} (${monPerToken} MON per token)`);
  
  return price;
 } catch (error) {
  console.warn(`Failed to fetch price for ${address}:`, error);
  return 0;
 }
}

/**
 * Get wallet token balances
 * 
 * Fetches user's token balances from your API. Teams should:
 * 1. Replace API endpoints with your balance endpoints
 * 2. Update response parsing to match your API structure
 * 3. Modify fallback token list for your supported tokens
 */
async function getWalletBalances(walletAddress: string): Promise<Token[]> {
 // Check cache first
 const cachedBalances = getCachedBalances(walletAddress);
 if (cachedBalances !== null) {
  return cachedBalances;
 }
 
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
   const defaultTokens = [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'MON', name: 'Monad', decimals: 18, balance: '0' },
    { address: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea', symbol: 'USDC', name: 'USD Coin', decimals: 6, balance: '0' }
   ];
   setCachedBalances(walletAddress, defaultTokens);
   return defaultTokens;
  }
  
  // Cache the successful result
  setCachedBalances(walletAddress, mappedTokens);
  console.log(`💾 Cached balances for ${walletAddress}`);
  
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

/**
 * Main Swap Interface Component
 * 
 * This is the primary component that implements all modern AMM UI/UX features.
 * Teams can use this as a reference or starting point for their own swap interface.
 */
export function SimpleSwapInterface() {
 // WALLET INTEGRATION - Replace with your wallet library
 const { ready, authenticated, login, logout } = usePrivy();
 const { wallets } = useWallets();
 const searchParams = useSearchParams();
 
 // =============================================================================
 // STATE VARIABLES - All the component state organized by feature
 // =============================================================================
 
 // CORE TOKEN & SWAP STATE
 const [availableTokens, setAvailableTokens] = useState<Token[]>([]);           // All available tokens
 const [verifiedTokenAddresses, setVerifiedTokenAddresses] = useState<Set<string>>(new Set()); // Verified token addresses
 const [fromToken, setFromToken] = useState<Token | null>(null);               // Selected input token
 const [toToken, setToToken] = useState<Token | null>(null);                   // Selected output token
 const [fromAmount, setFromAmount] = useState('');                             // Input amount (as string)
 const [toAmount, setToAmount] = useState('');                                 // Output amount (as string)
 
 // USD TOGGLE FEATURE - Key UX improvement: let users think in dollars
 const [fromMode, setFromMode] = useState<'token' | 'usd'>('token');           // Input mode: 'token' or 'usd'
 const [toMode, setToMode] = useState<'token' | 'usd'>('token');               // Output mode: 'token' or 'usd'
 
 // PRICING & QUOTE DATA
 const [monUsdPrice, setMonUsdPrice] = useState<number>(1.0);                  // Native token price in USD
 const [priceImpact, setPriceImpact] = useState<number | null>(null);          // Trade price impact %
 const [exchangeRate, setExchangeRate] = useState<string>('');                 // Exchange rate display (e.g., "1 ETH = 3,000 USDC")
 const [estimatedGas, setEstimatedGas] = useState<string>('');                 // Gas cost estimate
 const [tradingFee, setTradingFee] = useState<number>(0);                      // DEX trading fee %
 
 // LIVE QUOTES - Auto-refresh for accuracy
 const [quoteTimer, setQuoteTimer] = useState(15);                             // Countdown timer (seconds)
 const [lastQuoteTime, setLastQuoteTime] = useState<number>(Date.now());       // Last quote timestamp
 const [quoteLoading, setQuoteLoading] = useState(false);                      // Quote loading state
 const [lastEditedField, setLastEditedField] = useState<'from' | 'to'>('from'); // Track user's last edit
 
 // SLIPPAGE MANAGEMENT - Reactive based on price impact
 const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);      // User's slippage tolerance %
 const [customSlippage, setCustomSlippage] = useState<string>('');             // Custom slippage input
 
 // TRANSACTION STATE
 const [approving, setApproving] = useState(false);                            // Token approval in progress
 const [needsApproval, setNeedsApproval] = useState(false);                    // Token approval required
 
 // UI STATE
 const [loading, setLoading] = useState(false);                                // General loading state
 const [mounted, setMounted] = useState(false);                                // Next.js hydration fix
 const [showQuoteDetails, setShowQuoteDetails] = useState(false);              // Quote details expanded
 const [showSuccessModal, setShowSuccessModal] = useState(false);              // Success modal visible
 const [showSettingsModal, setShowSettingsModal] = useState(false);            // Settings modal visible
 
 // NOTIFICATION SYSTEM - User feedback
 const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string | React.ReactNode} | null>(null);
 const [swapResult, setSwapResult] = useState<{
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  txHash: string;
  priceImpact: number | null;
  gasUsed?: string;
 } | null>(null);

 // WALLET CONNECTION - Replace with your wallet integration
 const wallet = wallets[0];  // Primary connected wallet
 const [lastWalletAddress, setLastWalletAddress] = useState<string | null>(null); // For reactive wallet changes

 // =============================================================================
 // HELPER FUNCTIONS - Core functionality that teams can adapt
 // =============================================================================

 /**
  * NOTIFICATION SYSTEM
  * 
  * Shows user feedback messages. Teams can:
  * 1. Replace with their preferred toast/notification library
  * 2. Customize styling and positioning
  * 3. Add sound effects or animations
  */
 const showNotification = (type: 'success' | 'error' | 'info', message: string | React.ReactNode) => {
  setNotification({ type, message });
  
  // Auto-dismiss notifications after 5 seconds for info/success, 10 seconds for errors
  const dismissTime = type === 'error' ? 10000 : 5000;
  setTimeout(() => {
   setNotification(prev => prev?.message === message ? null : prev);
  }, dismissTime);
 };

 /**
  * QUOTE FETCHING - Core DEX functionality
  * 
  * Fetches swap quotes from your DEX API. Teams should:
  * 1. Replace the API endpoint (/api/pathfinder) with your quote endpoint
  * 2. Update request parameters to match your API
  * 3. Modify response parsing for your data structure
  * 4. Adjust price impact calculation logic
  * 
  * @param fromToken - Token being sold
  * @param toToken - Token being bought
  * @param amount - Amount to swap (in human-readable format)
  * @param isFromAmount - Whether amount is for input (true) or output (false)
  */
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
    
    // Calculate price impact
    if (quoteData.price_impact) {
     setPriceImpact(parseFloat(quoteData.price_impact));
    } else {
     // Manual calculation if not provided
     const inputValue = parseFloat(tokenAmount) * (fromToken.usdPrice || 0);
     const outputValue = outputAmount * (toToken.usdPrice || 0);
     if (inputValue > 0 && outputValue > 0) {
      const impact = ((inputValue - outputValue) / inputValue) * 100;
      setPriceImpact(Math.abs(impact));
     }
    }
    
    // Calculate exchange rate
    const inputAmount = parseFloat(tokenAmount);
    if (inputAmount > 0 && outputAmount > 0) {
     const rate = outputAmount / inputAmount;
     setExchangeRate(`1 ${fromToken.symbol} = ${formatSignificantFigures(rate, 4)} ${toToken.symbol}`);
    }
    
    // Set estimated gas (placeholder - would come from API)
    setEstimatedGas('~$0.50');
    
    // Set trading fee (0.3% typical for AMMs)
    setTradingFee(0.3);
    
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
    
    // Reset quote timer
    setLastQuoteTime(Date.now());
    setQuoteTimer(15);
   }
  } catch (error: any) {
   console.error('Quote fetch error:', error);
   
   // Enhanced error messages
   if (error.message.includes('insufficient liquidity')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Insufficient Liquidity</div>
      <div className="text-sm mt-1">This token pair doesn't have enough liquidity for your trade size. Try a smaller amount or a different token pair.</div>
     </div>
    ));
   } else if (error.message.includes('network')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Network Error</div>
      <div className="text-sm mt-1">Unable to connect to the Monorail API. Please check your connection and try again.</div>
     </div>
    ));
   } else {
    showNotification('error', (
     <div>
      <div className="font-medium">Quote Failed</div>
      <div className="text-sm mt-1">Unable to get a quote for this swap. Please try refreshing or selecting different tokens.</div>
     </div>
    ));
   }
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
 
 // Auto-refresh quotes with countdown
 useEffect(() => {
  if (!fromToken || !toToken || (!fromAmount && !toAmount)) return;
  
  const interval = setInterval(() => {
   setQuoteTimer(prev => {
    if (prev <= 1) {
     // Refresh quote
     if (lastEditedField === 'from' && fromAmount) {
      fetchQuote(fromToken, toToken, fromAmount, true);
     } else if (lastEditedField === 'to' && toAmount) {
      fetchQuote(toToken, fromToken, toAmount, false);
     }
     return 15;
    }
    return prev - 1;
   });
  }, 1000);
  
  return () => clearInterval(interval);
 }, [fromToken, toToken, fromAmount, toAmount, lastEditedField, lastQuoteTime]);

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
   
   if (error.code === 4001 || error.message.includes('user rejected')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Approval Cancelled</div>
      <div className="text-sm mt-1">You cancelled the approval. To swap this token, you need to approve the contract to spend it.</div>
     </div>
    ));
   } else if (error.message.includes('insufficient funds')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Insufficient Gas</div>
      <div className="text-sm mt-1">You don't have enough MON for gas fees. Add more MON to your wallet to continue.</div>
     </div>
    ));
   } else {
    showNotification('error', (
     <div>
      <div className="font-medium">Approval Failed</div>
      <div className="text-sm mt-1">The approval transaction failed. Please try again or contact support if the issue persists.</div>
     </div>
    ));
   }
  } finally {
   setApproving(false);
  }
 };

 /**
  * SWAP EXECUTION - Main transaction function
  * 
  * Executes the actual swap transaction. Teams should:
  * 1. Replace API endpoints with your swap execution endpoints
  * 2. Update transaction signing to match your wallet integration
  * 3. Modify approval logic for your token contracts
  * 4. Customize success/error handling
  * 
  * This function handles:
  * - Token approval (if needed)
  * - Transaction signing
  * - Transaction monitoring
  * - Success/error feedback
  */
 const executeSwap = async () => {
  if (!fromToken || !toToken || !fromAmount || !wallet?.address) {
   showNotification('error', (
    <div>
     <div className="font-medium">Cannot Execute Swap</div>
     <div className="text-sm mt-1">Please select both tokens and enter an amount to swap.</div>
    </div>
   ));
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
   
   // Estimate gas to catch errors before sending transaction
   showNotification('info', 'Estimating gas for transaction...');
   
   // Use Privy's wallet interface
   const provider = await wallet.getEthereumProvider();
   
   try {
    // Try to estimate gas first to catch revert errors
    await provider.request({
     method: 'eth_estimateGas',
     params: [{
      to: txRequest.to,
      data: txRequest.data,
      value: txRequest.value || '0x0',
      from: wallet.address
     }]
    });
   } catch (gasError: any) {
    console.error('Gas estimation failed:', gasError);
    
    // Parse common revert reasons
    if (gasError.message?.includes('8199f5f3')) {
     throw new Error('Insufficient token balance or allowance. Please check your balance and try again.');
    } else if (gasError.message?.includes('execution reverted')) {
     throw new Error('Transaction would fail. This could be due to insufficient balance, expired quote, or high slippage. Try refreshing the quote or increasing slippage tolerance.');
    } else {
     throw new Error(`Transaction validation failed: ${gasError.message || 'Unknown error'}`);
    }
   }
   
   showNotification('info', 'Please confirm the swap transaction in your wallet...');
   
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
    // Clear the waiting notification
    setNotification(null);
    
    // Prepare swap result data
    const result = {
     fromToken: fromToken!,
     toToken: toToken!,
     fromAmount: fromMode === 'usd' && fromToken.usdPrice 
      ? (parseFloat(fromAmount) / fromToken.usdPrice).toString() 
      : fromAmount,
     toAmount: toAmount,
     txHash: txResponse,
     priceImpact: priceImpact,
     gasUsed: estimatedGas
    };
    
    setSwapResult(result);
    setShowSuccessModal(true);
    
    // Reset form
    setFromAmount('');
    setToAmount('');
    setNeedsApproval(false);
    setPriceImpact(null);
    setExchangeRate('');
    
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
   
   // Enhanced error handling with specific solutions
   if (error.message.includes('user rejected') || error.code === 4001) {
    showNotification('error', (
     <div>
      <div className="font-medium">Transaction Cancelled</div>
      <div className="text-sm mt-1">You cancelled the transaction. Click the swap button again when you're ready to proceed.</div>
     </div>
    ));
   } else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Insufficient Balance</div>
      <div className="text-sm mt-1">You don't have enough {fromToken?.symbol} to complete this swap. Check your balance and try a smaller amount.</div>
     </div>
    ));
   } else if (error.message.includes('gas required exceeds allowance')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Gas Limit Too Low</div>
      <div className="text-sm mt-1">This transaction requires more gas than estimated. Try increasing your gas limit in your wallet settings.</div>
     </div>
    ));
   } else if (error.message.includes('slippage')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Price Moved Too Much</div>
      <div className="text-sm mt-1">The price changed more than your {slippageTolerance}% slippage tolerance. Try increasing slippage or submit the trade again.</div>
     </div>
    ));
   } else if (error.message.includes('nonce')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Transaction Conflict</div>
      <div className="text-sm mt-1">You have a pending transaction. Wait for it to complete or cancel it in your wallet before trying again.</div>
     </div>
    ));
   } else if (error.message.includes('network') || error.message.includes('timeout')) {
    showNotification('error', (
     <div>
      <div className="font-medium">Network Error</div>
      <div className="text-sm mt-1">Connection to the blockchain failed. Check your network connection and try again.</div>
     </div>
    ));
   } else {
    showNotification('error', (
     <div>
      <div className="font-medium">Swap Failed</div>
      <div className="text-sm mt-1">The swap couldn't be completed. Error: {error.message || 'Unknown error'}. Please try again or contact support.</div>
     </div>
    ));
   }
  } finally {
   setLoading(false);
  }
 };

 // Hydration fix
 useEffect(() => {
  setMounted(true);
  
  // Read URL parameters
  const fromTokenParam = searchParams.get('from');
  const toTokenParam = searchParams.get('to');
  const amountParam = searchParams.get('amount');
  
  if (fromTokenParam || toTokenParam || amountParam) {
   // Store params to apply after tokens are loaded
   const urlParams = { fromTokenParam, toTokenParam, amountParam };
   sessionStorage.setItem('pendingUrlParams', JSON.stringify(urlParams));
  }
 }, [searchParams]);

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
    
    // Progressive loading: Show tokens with balances immediately
    console.log('📊 Setting initial tokens with balances (no prices yet):', allTokens);
    setAvailableTokens(allTokens.map(token => ({ ...token, usdPrice: 0 })));
    
    // Smart fetching: Only get prices for tokens with balances or essential tokens
    const tokensNeedingPrices = allTokens.filter(token => {
     const hasBalance = parseFloat(token.balance || '0') > 0;
     const isEssential = ['MON', 'USDC'].includes(token.symbol);
     return hasBalance || isEssential;
    });
    
    console.log(`💰 Fetching prices for ${tokensNeedingPrices.length} tokens (out of ${allTokens.length})`);
    
    // Get prices for filtered tokens in parallel
    const priceResults = await Promise.all(
     tokensNeedingPrices.map(async (token) => {
      const usdPrice = await getTokenPrice(token.address, validMonPrice);
      return { address: token.address, usdPrice };
     })
    );
    
    // Update tokens with prices
    const tokensWithPrices = allTokens.map(token => {
     const priceData = priceResults.find(p => p.address === token.address);
     return { ...token, usdPrice: priceData?.usdPrice || 0 };
    });

    console.log('📊 Final tokens with prices and balances:', tokensWithPrices);
    setAvailableTokens(tokensWithPrices);
    
    // Set default tokens: MON -> USDC if none selected
    // Apply URL parameters if they exist
    const pendingParams = sessionStorage.getItem('pendingUrlParams');
    if (pendingParams) {
     const { fromTokenParam, toTokenParam, amountParam } = JSON.parse(pendingParams);
     sessionStorage.removeItem('pendingUrlParams');
     
     if (fromTokenParam) {
      const fromTokenFromUrl = tokensWithPrices.find(t => 
       t.address.toLowerCase() === fromTokenParam.toLowerCase()
      );
      if (fromTokenFromUrl) {
       setFromToken(fromTokenFromUrl);
      }
     }
     
     if (toTokenParam) {
      const toTokenFromUrl = tokensWithPrices.find(t => 
       t.address.toLowerCase() === toTokenParam.toLowerCase()
      );
      if (toTokenFromUrl) {
       setToToken(toTokenFromUrl);
      }
     }
     
     if (amountParam) {
      setFromAmount(amountParam);
      setFromMode('token');
      setLastEditedField('from');
     }
    } else {
     // Default token selection
     if (!fromToken && tokensWithPrices.length > 0) {
      const monToken = tokensWithPrices.find(t => t.symbol === 'MON');
      setFromToken(monToken || tokensWithPrices[0]);
     } else if (fromToken) {
      // Update existing fromToken with latest data (including balance)
      const updatedFromToken = tokensWithPrices.find(t => t.address === fromToken.address);
      if (updatedFromToken) setFromToken(updatedFromToken);
     }
     
     if (!toToken && tokensWithPrices.length > 0) {
      const usdcToken = tokensWithPrices.find(t => t.symbol === 'USDC');
      const fallbackToken = tokensWithPrices.find(t => t.symbol !== fromToken?.symbol);
      setToToken(usdcToken || fallbackToken || tokensWithPrices[0]);
     } else if (toToken) {
      // Update existing toToken with latest data (including balance)
      const updatedToToken = tokensWithPrices.find(t => t.address === toToken.address);
      if (updatedToToken) setToToken(updatedToToken);
     }
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
 
 // React to wallet account changes
 useEffect(() => {
  if (!wallet?.address) return;
  
  // Check if wallet address changed
  if (lastWalletAddress && lastWalletAddress !== wallet.address) {
   console.log('🔄 Wallet account changed from', lastWalletAddress, 'to', wallet.address);
   
   // Show notification about account change
   showNotification('info', (
    <div>
     <div className="font-medium">Account Changed</div>
     <div className="text-sm mt-1">Switched to {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}. Loading new balances...</div>
    </div>
   ));
   
   // Clear current balances to show loading state
   setAvailableTokens(prev => prev.map(token => ({ ...token, balance: '0' })));
   
   // Reset swap amounts
   setFromAmount('');
   setToAmount('');
   setPriceImpact(null);
   setExchangeRate('');
  }
  
  setLastWalletAddress(wallet.address);
 }, [wallet?.address, lastWalletAddress]);
 
 // Listen for wallet events
 useEffect(() => {
  if (!wallet) return;
  
  const setupWalletListeners = async () => {
   try {
    const provider = await wallet.getEthereumProvider();
    
    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
     console.log('🔄 Accounts changed event:', accounts);
     if (accounts.length === 0) {
      // User disconnected wallet
      logout();
     }
     // The wallet address will be updated by Privy, triggering our other effect
    };
    
    // Listen for chain changes
    const handleChainChanged = (chainId: string | number) => {
     console.log('🔗 Chain changed to:', chainId);
     const chainIdHex = typeof chainId === 'number' ? `0x${chainId.toString(16)}` : chainId;
     // Check if not on Monad Testnet (10143 = 0x27af)
     if (chainIdHex !== '0x27af') {
      showNotification('error', (
       <div>
        <div className="font-medium">Wrong Network</div>
        <div className="text-sm mt-1">Please switch to Monad Testnet in your wallet.</div>
       </div>
      ));
     }
    };
    
    if (provider.on) {
     provider.on('accountsChanged', handleAccountsChanged);
     provider.on('chainChanged', handleChainChanged);
     
     // Cleanup function
     return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
     };
    }
   } catch (error) {
    console.error('Failed to setup wallet listeners:', error);
   }
  };
  
  setupWalletListeners();
 }, [wallet, logout]);
 
 // Update URL when swap parameters change
 useEffect(() => {
  if (!mounted || !fromToken || !toToken) return;
  
  const params = new URLSearchParams();
  params.set('from', fromToken.address);
  params.set('to', toToken.address);
  
  // Only add amount if in token mode and has value
  if (fromAmount && fromMode === 'token') {
   params.set('amount', fromAmount);
  }
  
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
 }, [fromToken, toToken, fromAmount, fromMode, mounted]);

 // =============================================================================
 // UTILITY FUNCTIONS - Helper functions for calculations and formatting
 // =============================================================================

 /**
  * USD CONVERSION HELPERS
  * 
  * These functions power the USD toggle feature, allowing users to think in dollars.
  * Teams can customize the precision and formatting.
  */
 
 // Convert token amount to USD value
 const getTokenValue = (amount: string, token: Token | null): string => {
  if (!amount || !token?.usdPrice) return '';
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return '';
  return (numAmount * token.usdPrice).toFixed(2);
 };

 // Convert USD value to token amount
 const getUsdValue = (amount: string, token: Token | null): string => {
  if (!amount || !token?.usdPrice) return '';
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return '';
  return formatSignificantFigures(numAmount / token.usdPrice, 4);
 };

 /**
  * NUMBER FORMATTING
  * 
  * Formats numbers to significant figures for better UX.
  * Prevents showing too many decimal places.
  */
 const formatSignificantFigures = (num: number, sigFigs: number): string => {
  if (num === 0) return '0';
  const magnitude = Math.floor(Math.log10(Math.abs(num)));
  const factor = Math.pow(10, sigFigs - 1 - magnitude);
  return (Math.round(num * factor) / factor).toString();
 };

 // UX IMPROVEMENT: Removed blocking loading state for instant interface rendering
 // Instead of showing "Loading..." for a split second, we let the interface render 
 // immediately and handle wallet/hydration states gracefully within the UI components.
 // This eliminates the jarring flash of loading state that makes the app feel slower.

 // =============================================================================
 // MAIN UI RENDER - The actual swap interface
 // =============================================================================
 
 return (
  <div className="max-w-lg mx-auto p-4">
   {/* NOTIFICATION SYSTEM - User feedback */}
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
   
   <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg ">
    {/* HEADER - Title and action buttons */}
    <div className="flex items-center justify-between mb-6">
     <h1 className="text-2xl font-bold text-gray-900 ">Swap</h1>
     <div className="flex items-center space-x-3">
      {/* Share Button */}
      <button
       onClick={() => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        showNotification('success', 'Swap link copied to clipboard!');
       }}
       className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg "
       title="Share this swap"
      >
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.632-6.316a3 3 0 11-5.368 0m5.368 0A3 3 0 0118 8.342m-9.632 6.316a3 3 0 105.368 0M9 14.25v3.75m3-9v3.75m3-3.75v3.75" />
       </svg>
      </button>
      {/* Settings Button */}
      <button
       onClick={() => setShowSettingsModal(true)}
       className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg "
       title="Settings"
      >
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
       </svg>
      </button>
      {authenticated && wallet ? (
       <div className="flex items-center space-x-2">
        <div className="text-sm text-gray-600">
         {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </div>
        <button
         onClick={logout}
         className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg "
        >
         Disconnect
        </button>
       </div>
      ) : (
       <button
        onClick={login}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg "
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

    {/* FROM TOKEN SECTION - Input token selection and amount */}
    <div className="mb-4">
     <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-600 ">You pay</span>
      {fromToken && (
       <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500 ">
         Balance: {fromToken.balance ? parseFloat(fromToken.balance).toFixed(4) : '0.0000'} {fromToken.symbol}
        </span>
        {fromToken.balance && parseFloat(fromToken.balance) > 0 && (
         <div className="flex items-center space-x-1">
          <button
           onClick={() => {
            const balance = parseFloat(fromToken.balance || '0');
            const amount = balance * 0.25;
            setFromAmount(formatSignificantFigures(amount, 4));
            setFromMode('token');
            setLastEditedField('from');
           }}
           className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded "
          >
           25%
          </button>
          <button
           onClick={() => {
            const balance = parseFloat(fromToken.balance || '0');
            const amount = balance * 0.5;
            setFromAmount(formatSignificantFigures(amount, 4));
            setFromMode('token');
            setLastEditedField('from');
           }}
           className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded "
          >
           50%
          </button>
          <button
           onClick={() => {
            setFromAmount(fromToken.balance || '0');
            setFromMode('token');
            setLastEditedField('from');
           }}
           className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded "
          >
           MAX
          </button>
         </div>
        )}
       </div>
      )}
     </div>
     <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
       <TokenSelector
        tokens={availableTokens}
        selectedToken={fromToken}
        onTokenSelect={setFromToken}
        verifiedTokenAddresses={verifiedTokenAddresses}
        placeholder="Select token"
        mode="from"
       />
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
        className="w-full text-right text-3xl font-semibold bg-transparent border-none outline-none placeholder-gray-400 text-gray-900 "
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
         className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg "
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

    {/* SWAP DIRECTION BUTTON - Allows users to flip tokens */}
    <div className="flex justify-center -my-2 relative z-10">
     <button
      type="button"
      onClick={() => {
       setFromToken(toToken);
       setToToken(fromToken);
       setFromAmount(toAmount);
       setToAmount(fromAmount);
      }}
      className="p-2 bg-white rounded-xl border-4 border-gray-50 hover:bg-gray-50 "
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
       <TokenSelector
        tokens={availableTokens}
        selectedToken={toToken}
        onTokenSelect={setToToken}
        verifiedTokenAddresses={verifiedTokenAddresses}
        placeholder="Select token"
        mode="to"
       />
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
        className="w-full text-right text-3xl font-semibold bg-transparent border-none outline-none placeholder-gray-400 text-gray-900 "
       />
      </div>
      
      <div className="flex items-center justify-between mt-1">
       <div></div>
       <div className="flex items-center space-x-3">
        {toAmount && toToken && (
         <div className="text-lg text-gray-500 flex items-center space-x-2">
          <span>
           {toMode === 'token' 
            ? `$${getTokenValue(toAmount, toToken)}`
            : `${getUsdValue(toAmount, toToken)} ${toToken.symbol}`
           }
          </span>
          {priceImpact !== null && priceImpact > 0.1 && (
           <span className={`text-sm font-medium flex items-center space-x-1 ${
            priceImpact > 5 ? 'text-red-600' : priceImpact > 2 ? 'text-orange-600' : 'text-gray-500'
           }`}>
            {priceImpact > 5 && (
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
            )}
            {priceImpact > 2 && priceImpact <= 5 && (
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
            )}
            <span>(-{priceImpact.toFixed(2)}%)</span>
           </span>
          )}
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
         className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg "
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
    
    {/* Quote Info and Refresh */}
    {fromToken && toToken && (fromAmount || toAmount) && (
     <div className="mb-4">
      <div className="p-3 bg-gray-50 rounded-lg">
       <div className="flex items-center justify-between">
        <button
         onClick={() => setShowQuoteDetails(!showQuoteDetails)}
         className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
         <div>
          {exchangeRate && (
           <div className="font-medium text-gray-900">{exchangeRate}</div>
          )}
          {priceImpact !== null && (
           <div className={`text-xs mt-0.5 ${priceImpact > 5 ? 'text-red-600 font-medium' : priceImpact > 2 ? 'text-orange-600' : 'text-gray-500'}`}>
            {priceImpact > 5 && '⚠️ '}
            Price Impact: {priceImpact.toFixed(2)}%
           </div>
          )}
         </div>
         <svg 
          className={`w-4 h-4 transition-transform ${showQuoteDetails ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
         >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
         </svg>
        </button>
        <button
         onClick={() => {
          if (lastEditedField === 'from' && fromAmount) {
           fetchQuote(fromToken, toToken, fromAmount, true);
          } else if (lastEditedField === 'to' && toAmount) {
           fetchQuote(toToken, fromToken, toAmount, false);
          }
         }}
         disabled={quoteLoading}
         className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-blue-700"
        >
         <svg 
          className={`w-4 h-4 ${quoteLoading ? 'animate-spin' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
         >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
         </svg>
         <span>{quoteLoading ? 'Refreshing...' : `Refresh (${quoteTimer}s)`}</span>
        </button>
       </div>
       
       {/* Expandable Quote Details */}
       {showQuoteDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
         <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Network Cost</span>
          <span className="font-medium text-gray-900">{estimatedGas}</span>
         </div>
         <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Trading Fee</span>
          <span className="font-medium text-gray-900">{tradingFee}%</span>
         </div>
         <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Slippage Tolerance</span>
          <span className="font-medium text-gray-900">{slippageTolerance}%</span>
         </div>
         <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Route</span>
          <span className="font-medium text-gray-900">
           {fromToken.symbol} → {toToken.symbol}
          </span>
         </div>
        </div>
       )}
      </div>
      
      {/* High Price Impact Warning */}
      {priceImpact !== null && priceImpact > 5 && (
       <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-2">
         <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
         </svg>
         <div className="text-sm">
          <div className="font-medium text-red-900">High Price Impact</div>
          <div className="text-red-700 mt-0.5">
           This trade will move the market price significantly. Consider trading a smaller amount or accepting the price impact.
          </div>
         </div>
        </div>
       </div>
      )}
      
      {/* Reactive Slippage Field */}
      {(priceImpact !== null && priceImpact > 2) && (
       <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center justify-between">
         <div className="text-sm font-medium text-orange-900">Max Slippage</div>
         <div className="flex items-center space-x-1">
          <button
           onClick={() => {
            setSlippageTolerance(0.1);
            setCustomSlippage('');
           }}
           className={`px-2 py-1 text-xs font-medium rounded ${
            slippageTolerance === 0.1
             ? 'bg-orange-600 text-white'
             : 'bg-white text-gray-700 hover:bg-gray-100'
           }`}
          >
           0.1%
          </button>
          <button
           onClick={() => {
            setSlippageTolerance(0.5);
            setCustomSlippage('');
           }}
           className={`px-2 py-1 text-xs font-medium rounded ${
            slippageTolerance === 0.5
             ? 'bg-orange-600 text-white'
             : 'bg-white text-gray-700 hover:bg-gray-100'
           }`}
          >
           0.5%
          </button>
          <button
           onClick={() => {
            setSlippageTolerance(1.0);
            setCustomSlippage('');
           }}
           className={`px-2 py-1 text-xs font-medium rounded ${
            slippageTolerance === 1.0
             ? 'bg-orange-600 text-white'
             : 'bg-white text-gray-700 hover:bg-gray-100'
           }`}
          >
           1.0%
          </button>
          <div className="flex items-center">
           <input
            type="text"
            value={customSlippage}
            onChange={(e) => {
             const value = e.target.value;
             setCustomSlippage(value);
             const numValue = parseFloat(value);
             if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
              setSlippageTolerance(numValue);
             }
            }}
            placeholder="Custom"
            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
           />
           <span className="ml-1 text-xs text-gray-600">%</span>
          </div>
         </div>
        </div>
        {priceImpact !== null && priceImpact > 2 && (
         <div className="mt-2 text-xs text-orange-700">
          💡 Tip: Higher slippage helps ensure your trade succeeds during volatile market conditions.
         </div>
        )}
       </div>
      )}
     </div>
    )}

    {/* Slippage Warning */}
    {priceImpact !== null && priceImpact > slippageTolerance && (
     <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start space-x-2">
       <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
       </svg>
       <div className="text-sm">
        <div className="font-medium text-red-900">Price Impact Exceeds Slippage Tolerance</div>
        <div className="text-red-700 mt-0.5">
         This trade has {priceImpact.toFixed(2)}% price impact, which exceeds your {slippageTolerance}% slippage tolerance. 
         <button 
          onClick={() => setSlippageTolerance(Math.ceil(priceImpact * 10) / 10)}
          className="underline hover:no-underline font-medium"
         >
          Increase to {Math.ceil(priceImpact * 10) / 10}%
         </button> or trade a smaller amount.
        </div>
       </div>
      </div>
     </div>
    )}

    {/* Swap Button */}
    <button
     disabled={!fromToken || !toToken || !fromAmount || loading || quoteLoading || approving || (priceImpact !== null && priceImpact > slippageTolerance)}
     onClick={executeSwap}
     className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl "
    >
     {approving ? 'Approving...' :
      loading ? 'Processing...' : 
      quoteLoading ? 'Getting quote...' :
      !fromToken || !toToken ? 'Select tokens' : 
      !fromAmount ? 'Enter amount' : 
      (priceImpact !== null && priceImpact > slippageTolerance) ? 'Price impact too high' :
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
   
   {/* Success Modal */}
   {showSuccessModal && swapResult && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Success Icon */}
      <div className="flex justify-center mb-4">
       <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
       </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Swap Successful!</h2>
      
      {/* Swap Summary */}
      <div className="space-y-3 mb-6">
       <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
         <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
           {swapResult.fromToken.symbol.charAt(0)}
          </div>
          <span className="font-medium text-gray-900">
           {parseFloat(swapResult.fromAmount).toFixed(4)} {swapResult.fromToken.symbol}
          </span>
         </div>
         <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
         </svg>
         <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
           {swapResult.toToken.symbol.charAt(0)}
          </div>
          <span className="font-medium text-gray-900">
           {parseFloat(swapResult.toAmount).toFixed(4)} {swapResult.toToken.symbol}
          </span>
         </div>
        </div>
       </div>
       
       {/* Transaction Details */}
       <div className="space-y-2 text-sm">
        {swapResult.priceImpact !== null && (
         <div className="flex justify-between">
          <span className="text-gray-600">Price Impact</span>
          <span className={`font-medium ${swapResult.priceImpact > 5 ? 'text-red-600' : 'text-gray-900'}`}>
           {swapResult.priceImpact.toFixed(2)}%
          </span>
         </div>
        )}
        {swapResult.gasUsed && (
         <div className="flex justify-between">
          <span className="text-gray-600">Network Fee</span>
          <span className="font-medium text-gray-900">{swapResult.gasUsed}</span>
         </div>
        )}
       </div>
      </div>
      
      {/* Actions */}
      <div className="space-y-3">
       <a
        href={`https://testnet.monadexplorer.com/tx/${swapResult.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2"
       >
        <span>View on Explorer</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
       </a>
       <button
        onClick={() => {
         setShowSuccessModal(false);
         setSwapResult(null);
        }}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl "
       >
        Close
       </button>
      </div>
     </div>
    </div>
   )}
   
   {/* Settings Modal */}
   {showSettingsModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
       <h2 className="text-xl font-bold text-gray-900">Swap Settings</h2>
       <button
        onClick={() => setShowSettingsModal(false)}
        className="p-1 text-gray-400 hover:text-gray-600 rounded"
       >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
       </button>
      </div>
      
      {/* Default Slippage Setting */}
      <div className="mb-6">
       <label className="block text-sm font-medium text-gray-700 mb-3">
        Default Slippage Tolerance
       </label>
       <div className="flex items-center space-x-2">
        <button
         onClick={() => {
          setSlippageTolerance(0.1);
          setCustomSlippage('');
         }}
         className={`px-3 py-2 text-sm font-medium rounded ${
          slippageTolerance === 0.1
           ? 'bg-blue-600 text-white'
           : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
         }`}
        >
         0.1%
        </button>
        <button
         onClick={() => {
          setSlippageTolerance(0.5);
          setCustomSlippage('');
         }}
         className={`px-3 py-2 text-sm font-medium rounded ${
          slippageTolerance === 0.5
           ? 'bg-blue-600 text-white'
           : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
         }`}
        >
         0.5%
        </button>
        <button
         onClick={() => {
          setSlippageTolerance(1.0);
          setCustomSlippage('');
         }}
         className={`px-3 py-2 text-sm font-medium rounded ${
          slippageTolerance === 1.0
           ? 'bg-blue-600 text-white'
           : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
         }`}
        >
         1.0%
        </button>
        <div className="flex items-center">
         <input
          type="text"
          value={customSlippage}
          onChange={(e) => {
           const value = e.target.value;
           setCustomSlippage(value);
           const numValue = parseFloat(value);
           if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
            setSlippageTolerance(numValue);
           }
          }}
          placeholder="Custom"
          className="w-20 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
         />
         <span className="ml-1 text-sm text-gray-600">%</span>
        </div>
       </div>
       <p className="text-xs text-gray-500 mt-2">
        Your transaction will revert if the price changes unfavorably by more than this percentage.
       </p>
      </div>
      
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
       <div className="flex items-start space-x-2">
        <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs text-blue-800">
         <div className="font-medium">Current setting: {slippageTolerance}%</div>
         <div className="mt-1">Lower slippage reduces risk but may cause failed transactions. Higher slippage increases success rate but you may receive less tokens.</div>
        </div>
       </div>
      </div>
      
      <button
       onClick={() => setShowSettingsModal(false)}
       className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl "
      >
       Save Settings
      </button>
     </div>
    </div>
   )}
  </div>
 );
}