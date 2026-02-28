# SuperAdPro Smart Contracts

Base Chain | USDT | Solidity 0.8.24

## Architecture

- **SuperAdPro.sol** — Main contract (upgradeable proxy)
  - Membership: $20/month → $10 sponsor + $10 treasury
  - Grid Engine: 8 tiers ($20-$1000) → 25% sponsor + 70% uni-level + 5% platform
  - Course Engine: $100/$300/$500 → 100% to affiliate, first sale passes up

- **MockUSDT.sol** — Test USDT token for local development

## Setup

```bash
cd contracts
npm install
```

## Commands

```bash
# Compile
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Base Sepolia testnet
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network baseSepolia

# Deploy to Base mainnet
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network base

# Verify on BaseScan
npx hardhat verify --network base <PROXY_ADDRESS>
```

## Network Addresses

| Network | USDT | Contract |
|---------|------|----------|
| Base Mainnet (8453) | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | TBD |
| Base Sepolia (84532) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | TBD |

## Frontend Integration

Include on any page:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js"></script>
<script src="/static/js/wallet.js"></script>

<!-- Then use: -->
<script>
  await SuperAdProWallet.connect();
  await SuperAdProWallet.registerMember(sponsorAddress);
  await SuperAdProWallet.purchaseGridTier(3);
</script>
```

## Commission Splits

### Membership ($20/month)
| Recipient | Amount | % |
|-----------|--------|---|
| Sponsor | $10 | 50% |
| Treasury | $10 | 50% |

### Grid Tiers ($20-$1000)
| Recipient | % | Per $100 |
|-----------|---|----------|
| Direct Sponsor | 25% | $25 |
| Uni-Level (8 x 8.75%) | 70% | $70 |
| Platform | 5% | $5 |

### Courses ($100/$300/$500)
| Sale # | Recipient | % |
|--------|-----------|---|
| 1st at tier | Qualified upline | 100% |
| 2nd+ at tier | Selling affiliate | 100% |
