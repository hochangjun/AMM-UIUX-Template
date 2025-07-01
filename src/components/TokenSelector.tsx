'use client';

import { useState, useRef, useEffect } from 'react';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  usdPrice?: number;
}

interface TokenSelectorProps {
  tokens: Token[];
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
  verifiedTokenAddresses: Set<string>;
  placeholder?: string;
  mode?: 'from' | 'to';
}

export function TokenSelector({ 
  tokens, 
  selectedToken, 
  onTokenSelect, 
  verifiedTokenAddresses,
  placeholder = "Select token",
  mode = 'from'
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Copy address to clipboard
  const copyAddress = (address: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Filter tokens based on search
  const filteredTokens = tokens.filter(token => {
    const query = searchQuery.toLowerCase();
    return (
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    );
  });

  // Separate and sort tokens
  const sortTokens = (tokenList: Token[]) => {
    return tokenList.sort((a, b) => {
      // For 'to' mode, prioritize stablecoins and native token
      if (mode === 'to') {
        const isAStable = ['USDC', 'USDT', 'DAI'].includes(a.symbol);
        const isBStable = ['USDC', 'USDT', 'DAI'].includes(b.symbol);
        const isANative = a.symbol === 'MON';
        const isBNative = b.symbol === 'MON';
        
        if (isANative) return -1;
        if (isBNative) return 1;
        if (isAStable && !isBStable) return -1;
        if (!isAStable && isBStable) return 1;
      }
      
      // Then sort by balance (USD value)
      const aValue = parseFloat(a.balance || '0') * (a.usdPrice || 0);
      const bValue = parseFloat(b.balance || '0') * (b.usdPrice || 0);
      
      if (aValue !== bValue) {
        return bValue - aValue;
      }
      
      // Finally sort alphabetically
      return a.symbol.localeCompare(b.symbol);
    });
  };

  const verifiedTokens = sortTokens(filteredTokens.filter(token => 
    verifiedTokenAddresses.has(token.address.toLowerCase())
  ));
  
  const unverifiedTokens = sortTokens(filteredTokens.filter(token => 
    !verifiedTokenAddresses.has(token.address.toLowerCase())
  ));

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Token Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-gray-200 hover:bg-gray-250 rounded-lg px-3 py-2 cursor-pointer transition-colors min-w-[140px]"
      >
        {selectedToken ? (
          <>
            <div className={`w-8 h-8 bg-gradient-to-br ${
              mode === 'from' ? 'from-blue-400 to-blue-600' : 'from-green-400 to-green-600'
            } rounded-full flex items-center justify-center text-white font-bold`}>
              {selectedToken.symbol.charAt(0)}
            </div>
            <span className="font-semibold text-gray-900">{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-[320px] bg-white rounded-xl shadow-lg border border-gray-200 max-h-[400px] overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, symbol, or address"
              className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Token List */}
          <div className="overflow-y-auto max-h-[320px]">
            {verifiedTokens.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                  ✓ Verified Tokens
                </div>
                {verifiedTokens.map(token => (
                  <TokenItem
                    key={token.address}
                    token={token}
                    isSelected={selectedToken?.address === token.address}
                    onSelect={() => {
                      onTokenSelect(token);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    onCopyAddress={copyAddress}
                    copiedAddress={copiedAddress}
                  />
                ))}
              </div>
            )}
            
            {unverifiedTokens.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                  ⚠ Unverified Tokens
                </div>
                {unverifiedTokens.map(token => (
                  <TokenItem
                    key={token.address}
                    token={token}
                    isSelected={selectedToken?.address === token.address}
                    onSelect={() => {
                      onTokenSelect(token);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    onCopyAddress={copyAddress}
                    copiedAddress={copiedAddress}
                  />
                ))}
              </div>
            )}
            
            {filteredTokens.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No tokens found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TokenItem({ 
  token, 
  isSelected, 
  onSelect, 
  onCopyAddress, 
  copiedAddress 
}: {
  token: Token;
  isSelected: boolean;
  onSelect: () => void;
  onCopyAddress: (address: string, event: React.MouseEvent) => void;
  copiedAddress: string | null;
}) {
  const balance = parseFloat(token.balance || '0');
  const usdValue = balance * (token.usdPrice || 0);
  
  return (
    <button
      onClick={onSelect}
      className={`w-full px-3 py-2.5 hover:bg-gray-50 flex items-center justify-between transition-colors ${
        isSelected ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {token.symbol.charAt(0)}
        </div>
        <div className="text-left">
          <div className="font-medium text-gray-900">{token.symbol}</div>
          <div className="text-xs text-gray-500">{token.name}</div>
          <div
            onClick={(e) => onCopyAddress(token.address, e)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center space-x-1 mt-0.5 cursor-pointer"
          >
            <span>{`${token.address.slice(0, 6)}...${token.address.slice(-4)}`}</span>
            {copiedAddress === token.address ? (
              <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        {balance > 0 && (
          <>
            <div className="font-medium text-gray-900">{balance.toFixed(4)}</div>
            <div className="text-xs text-gray-500">${usdValue.toFixed(2)}</div>
          </>
        )}
      </div>
    </button>
  );
}