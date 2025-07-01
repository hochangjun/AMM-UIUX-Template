# AMM UI/UX Template - Implementation Guide

This repository contains a complete reference implementation of modern AMM DEX UI/UX patterns. It's designed to help AMM teams quickly implement best-in-class user experiences.

## 🎯 **What's Implemented**

Based on the comprehensive [AMM UI/UX article](https://twitter.com/hochangjun/status/XXXXX), this template includes:

### ✅ **Core Features**
1. **USD Toggle** - Let users think in dollars, not just tokens
2. **Balance Shortcuts** - 25%, 50%, MAX buttons for quick selection
3. **Enhanced Token Lists** - Search, contract addresses, click-to-copy
4. **Context-Aware Sorting** - Different token order for buy vs sell
5. **Live Quote Refresh** - Auto-refresh with countdown timer
6. **Fee Transparency** - Clear breakdown of all costs
7. **Reactive Slippage** - Smart slippage warnings based on price impact
8. **Shareable URLs** - Deep-linkable swaps via query parameters
9. **Success Modals** - Professional post-swap experience
10. **Smart Error Messages** - Actionable error guidance
11. **Reactive Wallet Connection** - Automatic account change detection

## 🚀 **Quick Start for AMM Teams**

### 1. **Fork and Customize**
```bash
git clone https://github.com/hochangjun/AMM-UIUX-Template.git
cd AMM-UIUX-Template
npm install
```

### 2. **Replace Core Integrations**

#### **Wallet Integration**
Replace Privy with your wallet library:
```typescript
// Current: Privy
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Replace with your wallet library:
// import { useWallet } from '@your-wallet-lib';
```

#### **API Endpoints**
Update these functions with your DEX API:
- `getMonUsdPrice()` - Your native token price endpoint
- `getTokenPrice()` - Your token price endpoint  
- `getWalletBalances()` - Your balance endpoint
- `fetchQuote()` - Your quote/routing endpoint

#### **Contract Addresses**
Update token addresses in:
- Default token lists
- Native token identifier (currently `'0x0000...'`)
- Stablecoin addresses for sorting

## 📋 **Implementation Checklist**

### **Phase 1: Basic Integration**
- [ ] Replace wallet connection library
- [ ] Update API endpoints for quotes
- [ ] Test basic swap functionality
- [ ] Customize token list sources

### **Phase 2: Advanced Features**
- [ ] Implement URL parameter handling
- [ ] Add slippage management
- [ ] Set up price impact calculations
- [ ] Test live quote refresh

### **Phase 3: Polish & Customization**
- [ ] Customize styling/branding
- [ ] Add your token verification logic
- [ ] Implement custom error handling
- [ ] Add analytics tracking

## 🎨 **Customization Guide**

### **Styling**
The template uses Tailwind CSS. To customize:

1. **Colors**: Update color schemes in components
2. **Layout**: Modify container sizes and spacing
3. **Typography**: Change font families and sizes
4. **Animations**: Add custom transitions

### **Token Management**
Key areas to customize:

```typescript
// Update stablecoin list for sorting
const isAStable = ['USDC', 'USDT', 'DAI'].includes(a.symbol);

// Update native token symbol
const isANative = a.symbol === 'MON'; // Replace 'MON'

// Update default tokens
const defaultTokens = [
  { address: '0x0000...', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  { address: '0xA0b8...', symbol: 'USDC', name: 'USD Coin', decimals: 6 }
];
```

## 🔧 **Key Components**

### **SimpleSwapInterface.tsx**
Main swap component with comprehensive comments:
- State management (all features)
- API integration points
- Wallet connection handling
- UI rendering logic

### **TokenSelector.tsx**
Enhanced token selection dropdown:
- Search functionality
- Copy-to-clipboard addresses
- Context-aware sorting
- Verification badges

## 💡 **Implementation Tips**

### **API Integration**
1. **Quote Fetching**: Implement debounced quote requests (200ms)
2. **Error Handling**: Provide specific, actionable error messages
3. **Caching**: Use the included caching system for performance
4. **Retry Logic**: Add retry mechanisms for failed requests

### **User Experience**
1. **Loading States**: Show loading indicators for all async operations
2. **Real-time Updates**: Update balances after successful swaps
3. **Validation**: Validate inputs before allowing swaps
4. **Feedback**: Provide immediate feedback for all user actions

### **Performance**
1. **Lazy Loading**: Only fetch prices for tokens with balances
2. **Memoization**: Use React.memo for expensive components
3. **Debouncing**: Debounce user inputs to prevent excessive API calls
4. **Caching**: Cache prices and balances with appropriate TTL

## 🧪 **Testing Recommendations**

### **Functional Testing**
- [ ] Token selection and search
- [ ] USD/token toggle functionality  
- [ ] Balance shortcuts (25%, 50%, MAX)
- [ ] Quote refresh and countdown
- [ ] Slippage tolerance changes
- [ ] Success and error flows

### **Edge Cases**
- [ ] Very small amounts (dust)
- [ ] Very large amounts (whale trades)
- [ ] High price impact scenarios
- [ ] Network connection issues
- [ ] Wallet disconnection/reconnection

### **Mobile Testing**
- [ ] Touch interactions
- [ ] Responsive layout
- [ ] Wallet connection flow
- [ ] Copy-to-clipboard functionality

## 🎯 **Best Practices**

### **Code Organization**
- Keep API functions separate and well-documented
- Use TypeScript for type safety
- Implement proper error boundaries
- Add comprehensive logging

### **User Experience**
- Always show what will happen before users confirm
- Provide escape hatches for stuck states
- Make error messages actionable
- Preserve user input during errors

### **Security**
- Validate all inputs client and server-side
- Never trust price data without verification
- Implement proper slippage protection
- Use secure random for transaction nonces

## 🤝 **Contributing**

This template is designed to be a community resource. Contributions welcome:

1. **Bug fixes** for better reliability
2. **New UX patterns** from your AMM experience  
3. **Integration guides** for popular wallet/API libraries
4. **Performance optimizations**

## 📞 **Support**

If you're implementing this template:

1. **Check the comments** - Extensive inline documentation
2. **Review the article** - Original UI/UX best practices
3. **Open issues** - For bugs or implementation questions
4. **Share feedback** - Help improve the template

---

**Built by AMM builders, for AMM builders** 🏗️

This template represents months of research into what makes DEX interfaces intuitive and professional. Use it to give your users the modern DeFi experience they deserve.