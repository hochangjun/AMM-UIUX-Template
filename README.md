# Monorail DEX Interface

A modern, professional DEX interface for Monad testnet built with Next.js 15, React 19, and Tailwind CSS. Integrates with Monorail's Pathfinder API for optimal swap routing and Privy for seamless wallet connections.

## ✨ Features

- **🔄 Token Swapping**: Swap between MON and verified ERC-20 tokens
- **💰 Real-time Pricing**: Live price feeds and USD conversion  
- **🔗 Wallet Integration**: Seamless connection via Privy
- **⚡ Smart Routing**: Powered by Monorail's Pathfinder API
- **🛡️ Secure Approvals**: Exact-amount token approvals for enhanced security
- **📱 Mobile Responsive**: Optimized for mobile DeFi usage
- **✨ Auto-execution**: Automatic swap execution after approvals
- **🎯 Professional UI**: Clean, modern interface with in-app notifications

## 🚀 Live Demo

[View Live Demo](https://your-vercel-url.vercel.app)

## 🛠 Tech Stack

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS 3
- **Wallet**: Privy for Web3 authentication
- **API**: Monorail Data API & Pathfinder for swaps
- **Network**: Monad Testnet
- **Deployment**: Vercel

## 🏁 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Privy account ([sign up here](https://privy.io))

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/hochangjun/monorailtest.git
cd monorailtest
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Add your Privy App ID to `.env.local`:
```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
```

4. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Your Privy application ID | Yes |

## 🌐 API Endpoints

The app uses proxy API routes to avoid CORS issues:

- `/api/monorail`: Proxies requests to Monorail Data API
- `/api/pathfinder`: Proxies requests to Pathfinder for swap quotes

## 📱 Usage

1. **Connect Wallet**: Click "Connect Wallet" and choose your preferred wallet
2. **Select Tokens**: Choose tokens to swap from the dropdowns (defaults to MON → USDC)
3. **Enter Amount**: Input the amount you want to swap
4. **Review**: Check the quote and conversion rates
5. **Swap**: Click "Swap" and approve transactions in your wallet
6. **Auto-execution**: For ERC-20 tokens, approve once and the swap executes automatically

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/hochangjun/monorailtest.git
git push -u origin main
```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add your `NEXT_PUBLIC_PRIVY_APP_ID` environment variable
   - Deploy!

3. **Environment Variables on Vercel:**
   - Go to your project settings
   - Add `NEXT_PUBLIC_PRIVY_APP_ID` with your Privy App ID

### Manual Deployment

```bash
npm run build
npm run start
```

## 🏗 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/           # API proxy routes
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Main page
│   │   └── providers.tsx  # Privy provider setup
│   └── components/
│       └── SimpleSwapInterface.tsx  # Main swap component
├── public/                # Static assets
├── package.json
├── vercel.json           # Vercel configuration
└── .env.example          # Environment variables template
```

## 🔗 Links

- **Monorail Discord**: [discord.monorail.xyz](https://discord.monorail.xyz)
- **Monorail Data API**: [testnet-api.monorail.xyz](https://testnet-api.monorail.xyz/v1/swagger)
- **Pathfinder API**: [testnet-pathfinder.monorail.xyz](https://testnet-pathfinder.monorail.xyz/v3/swagger)
- **Privy**: [privy.io](https://privy.io)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Open an issue for bugs or feature requests
- Join the [Monorail Discord](https://discord.monorail.xyz) for API support
- Check the [Privy docs](https://docs.privy.io) for wallet integration help

---

Built with ❤️ for the Monad ecosystem