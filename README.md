<p align="center">
  <a href="https://www.arkproject.dev">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ArkProjectNFTs/ark-project/assets/243668/d2fe57d6-9ce9-4245-8496-b5ed157831ab">
      <img alt="wagmi logo" src="https://github.com/ArkProjectNFTs/ark-project/assets/243668/d2fe57d6-9ce9-4245-8496-b5ed157831ab" width="auto" height="60">
    </picture>
  </a>
</p>

# ArkProject: A Global Infrastructure for Digital Assets Exchange

ArkProject is a liquidity layer for digital assets, uniting markets, empowering creators, and bridging the gap to mass adoption. Built on top of Starknet, ArkProject is designed to provide a fully decentralized and trustless orderbook on-chain.

## Documentation and Community

- **Documentation**: [docs.arkproject.dev](https://docs.arkproject.dev/)
- **Changelog**: [https://changelog.arkproject.dev](https://changelog.arkproject.dev/changelog)
- **Telegram**: [Join our Telegram group](https://t.me/arkprojectnfts)
- **X**: [Follow us on X](https://x.com/arkprojectnfts)

### What You Can Build with ArkProject

ArkProject offers a flexible and powerful infrastructure for building various decentralized applications and services in the digital assets space. Here are some examples of what you can build:

- **Decentralized Marketplaces**: Create fully decentralized and trustless marketplaces for digital assets, enabling direct user-to-user trading without intermediaries.
- **Custom Marketplaces for Collections**: Develop specialized marketplaces tailored to specific NFT collections, providing creators with dedicated platforms.
- **Generic Marketplaces**: Build general-purpose marketplaces that support a wide range of digital assets.
- **Private Marketplaces**: Establish private marketplaces for exclusive projects or communities.
- **Integration with Existing Platforms**: Enhance existing marketplaces, wallets, and decentralized apps with ArkProject's decentralized trading capabilities.
- **Market Makers**: Develop scripts to automate buying and selling activities, providing liquidity and market efficiency.
- **Mobile Apps**: Create mobile applications that leverage ArkProject’s infrastructure for on-the-go access to decentralized marketplaces and trading functionalities.

These capabilities allow developers to leverage ArkProject for a wide variety of use cases in the growing digital assets ecosystem.

## Project Overview

### Key Components

- **Layer 3 on Starknet**: Utilizes a modified version of the Dojo Katana sequencer.
- **Starknet Smart Contracts**: Handle order creation, fulfillment, and marketplace registration.
- **Orderbook Smart Contracts**: Enable a decentralized and trustless orderbook on Layer 3.
- **Crosschain Messaging**: Facilitates interaction between Starknet contracts and orderbooks.

### Features

- **Marketplace Fees & Creator Fees**: Handled via our protocol, supporting EIP-2981 for royalties.
- **Open Source Marketplaces**: Allows anyone to create their own marketplaces for collections or private projects.
- **SDKs**: Vanilla JS library and React hook library for seamless integration into front ends.

### Networks

#### Mainnet

- **Sequencer Address (Arkchain)**: [https://production.solis.arkproject.dev/](https://production.solis.arkproject.dev/)
- **Starknet Executor Contract**: [https://starkscan.co/contract/0x007b42945bc47001db92fe1b9739d753925263f2f1036c2ae1f87536c916ee6a](https://starkscan.co/contract/0x007b42945bc47001db92fe1b9739d753925263f2f1036c2ae1f87536c916ee6a)

#### Sepolia

- **Sequencer Address (Arkchain)**: [https://sepolia.solis.arkproject.dev/](https://sepolia.solis.arkproject.dev/)
- **Starknet Executor Contract**: [https://sepolia.starkscan.co/contract/0x00b86ab357c15c12fb78f9b0a19fa974c730fcbab96f17881827dde871665f0b](https://sepolia.starkscan.co/contract/0x00b86ab357c15c12fb78f9b0a19fa974c730fcbab96f17881827dde871665f0b)

### Demo

Check out our demo app showcasing a mini marketplace: [ArkProject SDK Demo](https://ark-project-sdk-demo.vercel.app/)

## Repository Structure

### Contracts

- [Common Contracts](https://github.com/ArkProjectNFTs/ark-project/tree/main/contracts/ark_common)
- [Orderbook Contracts](https://github.com/ArkProjectNFTs/ark-project/tree/main/contracts/ark_orderbook)
- [Starknet Contracts](https://github.com/ArkProjectNFTs/ark-project/tree/main/contracts/ark_starknet)
- [Test Tokens Contracts](https://github.com/ArkProjectNFTs/ark-project/tree/main/contracts/ark_tokens)

### Libraries

- [ArkProject Core Vanilla JS Library](https://github.com/ArkProjectNFTs/ark-project/tree/main/packages/core)
- [ArkProject React Library](https://github.com/ArkProjectNFTs/ark-project/tree/main/packages/react)

### Example App

- [Mini Marketplace Demo](https://github.com/ArkProjectNFTs/ark-project/tree/main/apps)

### Deployment Tools

- [Deploy Package](https://github.com/ArkProjectNFTs/ark-project/tree/main/packages/deployer)

### Crates for NFT Indexation

- [Pontos (NFT Indexer Library)](https://github.com/ArkProjectNFTs/ark-project/tree/main/crates/pontos)
- [Metadata](https://github.com/ArkProjectNFTs/ark-project/tree/main/crates/ark-metadata)
- [Starknet Utilities](https://github.com/ArkProjectNFTs/ark-project/tree/main/crates/ark-starknet)
- [Diri (Indexer Library for Solis and Arkchain)](https://github.com/ArkProjectNFTs/ark-project/tree/main/crates/diri)

### Layer 3 Sequencer

- [Solis](https://github.com/ArkProjectNFTs/ark-project/tree/main/crates/solis)

## Quick Start for Local Development

1. **Install the latest Dojo version** (currently 0.0.7-alpha.1)

   - Follow the guide: https://book.dojoengine.org/getting-started

2. **Install Packages**

   ```bash
   pnpm install
   ```

3. **Build Contracts**

   ```bash
   cd contracts && scarb build --workspaces
   ```

4. **Launch Katana**

   ```bash
   katana
   ```

5. **Deploy Starknet Contracts**

   ```bash
   pnpm deploy:starknet:local
   ```

6. **Launch Solis**

   ```bash
   cargo run -p solis -- --chain-id 0x736f6c6973 --messaging crates/solis/messaging.local.json --disable-fee -p 7777
   ```

7. **Deploy Solis Contracts**

   ```bash
   pnpm deploy:solis:local
   ```

8. **Build the Core and React SDKs**

   ```bash
   pnpm build --filter=core --filter=react
   ```

9. **Try Core SDK Examples**

   ```bash
   cd examples/core
   npx bun fulfillListing.ts
   ```

## License

ArkProject is licensed under the [Apache License](./LICENCE).

---

We hope you find ArkProject useful and encourage you to contribute to its development. If you have any questions, please open an issue or submit a pull request. Happy coding!
