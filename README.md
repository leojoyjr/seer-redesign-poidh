# Seer Redesign (poidh)

A redesign of the six Seer interfaces as one connected product: a homepage and five apps (Seer App, Deep, Futarchy, Opportunity Markets, Risk Pricing) behind one persistent header with a shared Apps menu, theme toggle and wallet button. Built for the POIDH Seer rebrand contest.

Every interface answers the same three questions: who is asking, what the market prices, and how to use the signal. Wallet connection and trade confirmations are simulated demo flows. Market data comes from public Seer sources; no live trading.

## Routes
| Route | Interface |
|---|---|
| `/` | Homepage |
| `/explorer` | Seer App (explorer for all markets) |
| `/deep` | Deep |
| `/futarchy` | Futarchy |
| `/opportunity` | Opportunity Markets |
| `/risk` | Risk Pricing |

## Run
```bash
npm install
npm run dev      # http://localhost:5188
npm run build    # outputs dist/
```

## Layout
- `src/` homepage (`seer-2026/designs/monument`) and the shared product shell (`products/shared`).
- `public/p/<product>/` the built, ready-to-serve bundle of each product (the shell loads these).
- `products/<product>/` the source of each product app (Vite + React; Seer App is plain JS in `public/p/explorer-v2`).
- `vercel.json` route rewrites for deployment on Vercel.
