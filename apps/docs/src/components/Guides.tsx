import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

const guides = [
  {
    href: '/create-marketplace',
    name: 'Creating Your Own Marketplace',
    description:
      'Leverage our open-source frontend and comprehensive set of APIs to build a personalized marketplace tailored to your needs.',
  },
  {
    href: '/using-apis',
    name: 'Using Our APIs',
    description:
      'From real-time market data to secure token transfers, our APIs provide all the functionalities you need to integrate with the Arkchain NFT Marketplace Protocol.',
  },
  {
    href: '/interact-orderbook',
    name: 'Interacting with the Orderbook',
    description:
      'Unlock the full potential of our open order book by integrating it with your frontend. This guide will walk you through the process.',
  },
  {
    href: '/nft-indexer-rust',
    name: 'Setting Up the NFT Indexer in Rust',
    description:
      'A deep dive into our NFT indexer, built in Rust, and how you can leverage it for efficient indexing of NFT data.',
  },
]

export function Guides() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="guides">
        Guides
      </Heading>
      <div className="mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 dark:border-white/5 sm:grid-cols-2 xl:grid-cols-4">
        {guides.map((guide) => (
          <div key={guide.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {guide.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {guide.description}
            </p>
            <p className="mt-4">
              <Button href={guide.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
