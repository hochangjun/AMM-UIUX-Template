# Claude Instructions for This Project

## Project Context
This is a Monad testnet AMM interface built with Next.js 15, React 19, and Tailwind CSS. It integrates with Monorail API for DEX aggregation and uses Privy for wallet connections.

## Development Preferences
- Always use the TodoWrite tool for multi-step tasks to track progress
- Prioritize editing existing files over creating new ones
- Follow the existing code patterns and conventions
- Run `npm run dev` to test changes locally 
- Use TypeScript strict mode and maintain type safety
- **Always push changes to GitHub after completing tasks**

## AMM-Specific Guidelines
- Prioritize wallet-owned tokens in dropdowns
- Implement dual USD/token input modes
- Ensure real-time quote updates
- Maintain responsive design for mobile DeFi usage
- Follow modern DEX UX patterns (similar to Uniswap)

## Code Style
- Use Tailwind CSS for styling
- Implement proper error handling and loading states
- Use React hooks and context patterns
- Keep components modular and reusable
- Add proper TypeScript interfaces

## Testing
- Test locally with `npm run dev`
- Verify wallet connection flows
- Test token selection and swap functionality
- Ensure mobile responsiveness

## API Integration
- Use Monorail testnet endpoints
- Implement proper error handling for API calls
- Cache data appropriately to avoid rate limits
- Handle network switching (Monad testnet)