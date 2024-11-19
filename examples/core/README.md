# Core Examples Scripts

Example scripts demonstrating marketplace functionalities using the Ark Protocol.

## Environment Setup

Set up the required environment variables before running any scripts. 

## Available Scripts

### Fee Management
- `setup-fees.ts`: Configure marketplace fee structure

### Offer Management
- `fulfill-offer.ts`: Create and fulfill token-specific offers
- `fulfill-collection-offer.ts`: Create and fulfill collection-wide offers

### Listing Operations
- `fulfill-listing-default.ts`: Process listings with default royalties
- `fulfill-listing-collection.ts`: Handle listings with collection royalties
- `fulfill-listing-2981.ts`: Execute listings using EIP-2981 royalty standard
- `cancel-listing.ts`: Create and cancel listings

### Auction Operations
- `fulfill-auction.ts`: Create and complete auctions
- `cancel-auction.ts`: Create and cancel auctions

## Usage

1. Configure environment variables
2. Execute scripts:
```bash
npx bun scripts/<script-name>.ts
```

Each script includes detailed logging for tracking execution progress and error handling.