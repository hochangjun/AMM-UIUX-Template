# Advanced Swap UI - Project Plan

## Background and Motivation

**Current State**: The project is currently a "panic button" application that allows users to liquidate all tokens to USDC in emergency situations. The UI is basic and functional but limited.

**New Vision**: Transform this into a sophisticated swap interface that improves upon existing DEXes like Uniswap by offering:
- Dual input modes (token quantity + USD denominated amounts)
- Bidirectional calculation (input target amount, auto-calculate source)
- Integrated market data (market cap, FDV) instead of external links
- Modern, intuitive UI inspired by Pendle's design patterns

**Business Value**: Create a best-in-class swap interface that provides superior UX compared to existing solutions, particularly in terms of input flexibility and integrated market data.

## Key Challenges and Analysis

### 1. **Price Data Integration**
- Need real-time token prices for USD conversion
- Market cap/FDV data requires token supply information
- Rate limiting and API reliability considerations
- Caching strategy for price data

### 2. **Bidirectional Calculation Logic**
- Complex math for reverse calculations (output → input)
- Handling slippage in reverse calculations
- Real-time quote updates as user types
- Debouncing API calls for performance

### 3. **State Management Complexity**
- Multiple input modes (quantity vs USD)
- Synchronizing four potential inputs (from quantity, from USD, to quantity, to USD)
- Managing which field is the "source of truth"
- Quote refresh timing and invalidation

### 4. **UI/UX Sophistication**
- Responsive design across devices
- Smooth animations and transitions
- Error handling and loading states
- Accessibility compliance

### 5. **API Integration Architecture**
- Monorail API for quotes and token data
- External price APIs for USD conversion
- Token metadata and market data sources
- Error handling and fallback strategies

## High-level Task Breakdown

### Phase 1: Foundation & Data Layer
- [ ] **Task 1.1**: Research and integrate price data APIs
  - Success Criteria: Real-time token prices available in app
  - Estimated Time: 2-3 hours
  
- [ ] **Task 1.2**: Design state management architecture
  - Success Criteria: Clean state structure for managing swap inputs
  - Estimated Time: 1-2 hours
  
- [ ] **Task 1.3**: Create token data service layer
  - Success Criteria: Unified API for token prices, metadata, and market data
  - Estimated Time: 2-3 hours

### Phase 2: Core Swap Logic
- [ ] **Task 2.1**: Implement bidirectional calculation engine
  - Success Criteria: Input in any field correctly calculates other fields
  - Estimated Time: 3-4 hours
  
- [ ] **Task 2.2**: Quote management system
  - Success Criteria: Real-time quotes with proper debouncing
  - Estimated Time: 2-3 hours
  
- [ ] **Task 2.3**: USD conversion logic
  - Success Criteria: Accurate USD ↔ token quantity conversions
  - Estimated Time: 2 hours

### Phase 3: Advanced UI Components
- [ ] **Task 3.1**: Design and implement token selector with market data
  - Success Criteria: Beautiful token picker showing prices, market cap, FDV
  - Estimated Time: 4-5 hours
  
- [ ] **Task 3.2**: Dual-mode input fields (quantity/USD toggle)
  - Success Criteria: Users can toggle between quantity and USD for both fields
  - Estimated Time: 3-4 hours
  
- [ ] **Task 3.3**: Smart input field with auto-calculation
  - Success Criteria: Type in "to" field, "from" field auto-calculates
  - Estimated Time: 2-3 hours

### Phase 4: Polish & Integration
- [ ] **Task 4.1**: Transaction execution integration
  - Success Criteria: Seamless transaction flow from new UI
  - Estimated Time: 2-3 hours
  
- [ ] **Task 4.2**: Error handling and edge cases
  - Success Criteria: Graceful handling of all error scenarios
  - Estimated Time: 2-3 hours
  
- [ ] **Task 4.3**: Performance optimization and testing
  - Success Criteria: Fast, responsive UI with comprehensive test coverage
  - Estimated Time: 3-4 hours

## Project Status Board

### 🚀 Ready to Start
- [ ] Task 4.2: Error handling and edge cases
- [ ] Task 4.3: Performance optimization and testing

### 🏗️ In Progress
*No tasks currently in progress*

### ✅ Completed
- [x] Task 1.1: Research and integrate price data APIs (RESOLVED: Using Monorail APIs)
- [x] Task 1.2: Design state management architecture (SwapContext with React Context + useReducer)
- [x] Task 1.3: Create token data service layer (TokenService with Monorail integration)
- [x] Task 2.1: Implement bidirectional calculation engine (useSwapCalculations hook with debouncing)
- [x] Task 2.2: Quote management system (QuoteService with caching, deduplication, reverse quotes)
- [x] Task 2.3: USD conversion logic (ConversionService with smart formatting and validation)
- [x] Task 3.1: Design and implement token selector with market data (TokenSelector with search, market data)
- [x] Task 3.2: Dual-mode input fields (quantity/USD toggle) (SwapInputField with mode switching)
- [x] Task 3.3: Smart input field with auto-calculation (AdvancedSwapInterface integration)
- [x] Task 4.1: Transaction execution integration (TransactionService with Privy wallet integration)

### ❌ Blocked
*No blocked tasks*

## Current Status / Progress Tracking

**Project Phase**: Phase 4 - Polish & Integration (IN PROGRESS)
**Overall Progress**: 92% (3.75 out of 4 phases complete)
**Next Milestone**: Complete Phase 4 - Error handling and performance optimization

**Current Priority**: Clean up linting issues and implement error handling

**🐛 CRITICAL BUG FIXED**: Token dropdown error resolved - formatUsd function now handles undefined/null values properly

## Executor's Feedback or Assistance Requests

**🚀 TASK 4.1 COMPLETED - TRANSACTION EXECUTION INTEGRATION!**

Successfully integrated transaction execution with complete end-to-end swap functionality:

**New Implementation - Task 4.1:**
9. **TransactionService** - Complete transaction execution with Privy wallet integration, error parsing, gas estimation
10. **Enhanced SwapContext** - Added quote management actions and proper state handling
11. **Integrated AdvancedSwapInterface** - Connected beautiful UI to actual transaction execution

**Complete Feature Set Now Available:**

**Phase 1 Foundation (COMPLETE):**
1. **TokenService** - Complete price data integration with Monorail APIs
2. **SwapContext** - Sophisticated state management with React Context + useReducer  
3. **useSwapCalculations** - Bidirectional calculation engine with debouncing

**Phase 2 Core Logic (COMPLETE):**  
4. **QuoteService** - Advanced quote management with caching, deduplication, and reverse quotes
5. **ConversionService** - Smart USD conversion with formatting, validation, and batch operations

**Phase 3 Advanced UI (COMPLETE):**
6. **TokenSelector** - Beautiful token picker with market data, search, confidence indicators
7. **SwapInputField** - Dual-mode input fields (token/USD toggle) with smart formatting
8. **AdvancedSwapInterface** - Complete swap UI with price impact warnings, loading states

**Key Features Implemented:**
- Real-time price fetching with 30-second caching
- MON/USD conversion with confidence indicators
- Complex state management for 4 input fields (from/to × token/USD)
- Bidirectional calculations (input any field, others auto-update)
- Beautiful Pendle-inspired design with purple/blue gradients
- Token selector with market data (MC, FDV, 24h change, confidence)
- Dual-mode input fields with seamless USD/token switching
- Smart formatting for large numbers (K/M/B suffixes)
- Price impact warnings and transaction state management
- Responsive design with loading states and error handling

**Ready for Phase 4!** The beautiful, functional swap interface is complete - just need transaction execution integration!

**Pending Questions for Human User**:
1. ✅ **RESOLVED**: Price data will use Monorail's built-in APIs
2. Should we support fiat currencies beyond USD?
3. Any specific design preferences or brand colors to maintain?
4. Performance requirements (target load times, responsiveness)?

**Required Information**:
- Design system requirements or existing brand guidelines
- Target user base and device support requirements

**Price Data Architecture - CONFIRMED**:
- **MON/USD Rate**: `https://testnet-api.monorail.xyz/v1/symbol/MONUSD`
- **Token Pricing**: `https://testnet-api.monorail.xyz/v1/token/{ADDRESS}`
- **USD Calculation**: `mon_per_token * MON_USD_price = token_USD_price`
- **Confidence Indicator**: `pconf` field shows pool count (higher = more reliable)

## Lessons

*No lessons learned yet - project just starting*

## Technical Architecture Notes

### Proposed Tech Stack Additions
- **Price Data**: Monorail's unified API for token prices and MON/USD rates
- **State Management**: React Context + useReducer for complex swap state
- **UI Components**: Custom components inspired by Pendle's design
- **Caching**: localStorage for price cache with TTL
- **Debouncing**: lodash.debounce for API calls

### Key Design Decisions
1. **Single Source of Truth**: One input field drives all calculations at a time
2. **Price Caching**: 30-second cache for token prices to reduce API calls
3. **Unified API Strategy**: Use Monorail for both swap quotes and price data
4. **Price Confidence**: Display `pconf` values to users for transparency
5. **Mobile First**: Responsive design prioritizing mobile experience 