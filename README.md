# AMM UI/UX Template

A complete reference implementation of modern AMM DEX user interface patterns. This template implements all the UI/UX best practices from the comprehensive [AMM DEX UI/UX guide](https://twitter.com/hochangjun), designed to help AMM teams build world-class user experiences.

## 🌟 **Why This Template?**

Most AMM DEXes lack basic UI/UX features that users expect. This template provides a production-ready implementation of:

- **USD Toggle** - Let users think in dollars, not just tokens
- **Smart Token Lists** - Wallet-first sorting with verification badges  
- **Live Quotes** - Auto-refresh with countdown timer
- **Reactive Slippage** - Dynamic warnings based on price impact
- **Enhanced Input Fields** - Balance shortcuts and bidirectional calculation
- **Professional Error Handling** - Actionable error messages with solutions
- **Shareable Swaps** - Deep-linkable URLs for social sharing

## 🎯 **Perfect For**

- **AMM Teams** building new DEX interfaces
- **Frontend Developers** wanting modern DeFi UX patterns
- **Product Managers** defining DEX feature requirements
- **Designers** understanding DeFi interaction patterns

## 🚀 **Quick Start**

```bash
# Clone the template
git clone https://github.com/hochangjun/AMM-UIUX-Template.git
cd AMM-UIUX-Template

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the template in action.

## 📋 **What's Included**

### **Core Components**
- `SimpleSwapInterface.tsx` - Main swap component with all features
- `TokenSelector.tsx` - Enhanced token selection dropdown

### **Key Features**
✅ USD/Token input toggles  
✅ Balance shortcuts (25%, 50%, MAX)  
✅ Enhanced token search with copy addresses  
✅ Context-aware token sorting  
✅ Live quote refresh with countdown  
✅ Expandable fee breakdown  
✅ Reactive slippage management  
✅ Shareable swap URLs  
✅ Professional success modals  
✅ Smart error messages  
✅ Reactive wallet connection  

### **Documentation**
- **Extensive inline comments** explaining every feature
- **Implementation guide** for customization
- **Integration examples** for common scenarios

## 🔧 **Easy to Customize**

The template is designed for easy adaptation:

### **Replace Wallet Integration**
```typescript
// Current: Privy
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Replace with your wallet library
import { useWallet } from '@your-wallet-lib';
```

### **Update API Endpoints**
```typescript
// Replace these functions with your API calls:
- getMonUsdPrice()     // Your native token price
- getTokenPrice()      // Your token prices  
- getWalletBalances()  // Your balance endpoint
- fetchQuote()         // Your routing/quotes
```

### **Customize Styling**
Built with Tailwind CSS for easy theming and customization.

## 📖 **Implementation Guide**

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for detailed instructions on:

- **Phase-by-phase implementation** approach
- **API integration** examples
- **Customization** guidelines  
- **Testing** recommendations
- **Best practices** for production

## 🎨 **Live Demo**

The template includes a working demo using:
- **Monad Testnet** for blockchain interaction
- **Monorail API** for quotes and prices
- **Privy** for wallet connection

*Teams should replace these with their own infrastructure.*

## 💡 **Key UX Insights**

This template implements research-backed UX patterns:

1. **Users think in dollars** - USD toggle reduces cognitive load
2. **Context matters** - Different token lists for buying vs selling
3. **Transparency builds trust** - Clear fee breakdown and price impact
4. **Errors should educate** - Actionable error messages with solutions
5. **Speed is critical** - Live quotes with visual countdown
6. **Mobile-first** - Touch-friendly interactions and responsive design

## 🏗️ **Built for Production**

- **TypeScript** for type safety
- **Comprehensive error handling** for edge cases
- **Performance optimized** with caching and debouncing
- **Accessibility considered** with proper ARIA labels
- **Mobile responsive** design patterns

## 🤝 **Community**

This template is a community resource. Contributions welcome:

- **Bug fixes** and improvements
- **New UX patterns** from your DEX experience
- **Integration guides** for popular libraries
- **Performance optimizations**

## 📄 **License**

MIT License - Use freely in your projects.

## 🙏 **Acknowledgments**

Built from real-world experience and user feedback from:
- AMM development teams
- DeFi power users  
- Frontend developers
- UX researchers

---

**Give your users the modern DeFi experience they deserve** ✨

*This template represents months of research into what makes DEX interfaces intuitive, trustworthy, and professional. Use it to build better AMMs.*