'use client'

import Link from 'next/link'
import {
  type MotionValue,
  motion,
  useMotionTemplate,
  useMotionValue,
} from 'framer-motion'

import { GridPattern } from '@/components/GridPattern'
import { Heading } from '@/components/Heading'
import { ChatBubbleIcon } from '@/components/icons/ChatBubbleIcon'
import { EnvelopeIcon } from '@/components/icons/EnvelopeIcon'
import { UserIcon } from '@/components/icons/UserIcon'
import { UsersIcon } from '@/components/icons/UsersIcon'
import { DeveloperExperienceIcon } from './icons/DeveloperExperienceIcon'

interface Resource {
  href: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  pattern: Omit<
    React.ComponentPropsWithoutRef<typeof GridPattern>,
    'width' | 'height' | 'x'
  >
}

const resources: Array<Resource> = [
  {
    href: '/market-api-doc',
    name: 'Market API Documentation',
    description:
      "Detailed documentation on accessing real-time data, including pricing, orders, sales, and more across all of Starknet's NFT marketplaces.",
    icon: DeveloperExperienceIcon, // Replace with an appropriate icon
    pattern: {
      y: 16,
      squares: [
        [0, 1],
        [1, 3],
      ],
    },
  },
  {
    href: '/trading-api-ref',
    name: 'Trading API Reference',
    description:
      'Comprehensive guide on viewing and placing orders, managing secure token transfers, and more.',
    icon: DeveloperExperienceIcon, // Replace with an appropriate icon
    pattern: {
      y: -6,
      squares: [
        [-1, 2],
        [1, 3],
      ],
    },
  },
  {
    href: '/nft-api-overview',
    name: 'NFT API Overview',
    description:
      'Understand the standardized Starknet NFT metadata, including traits and attributes.',
    icon: DeveloperExperienceIcon, // Replace with an appropriate icon
    pattern: {
      y: 32,
      squares: [
        [0, 2],
        [1, 4],
      ],
    },
  },
  {
    href: '/nft-bridge-guide',
    name: 'NFT Bridge Guide',
    description:
      'Learn about our collaboration with Starkware for secure and efficient NFT transfers between Ethereum L1 and Starknet L2.',
    icon: DeveloperExperienceIcon, // Replace with an appropriate icon
    pattern: {
      y: 22,
      squares: [[0, 1]],
    },
  },
]

function ResourceIcon({ icon: Icon }: { icon: Resource['icon'] }) {
  return <Icon className="h-[3.75rem] w-10 " />
}

function ResourcePattern({
  mouseX,
  mouseY,
  ...gridProps
}: Resource['pattern'] & {
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
}) {
  let maskImage = useMotionTemplate`radial-gradient(180px at ${mouseX}px ${mouseY}px, white, transparent)`
  let style = { maskImage, WebkitMaskImage: maskImage }

  return (
    <div className="pointer-events-none">
      <motion.div
        className="dark:from-space-blue-800 dark:to-space-blue-900 from-space-blue-50 to-space-blue-100 absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 transition duration-300 group-hover:opacity-100"
        style={style}
      />
    </div>
  )
}

function Resource({ resource }: { resource: Resource }) {
  let mouseX = useMotionValue(0)
  let mouseY = useMotionValue(0)

  function onMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    let { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      key={resource.href}
      onMouseMove={onMouseMove}
      className="group relative flex rounded-2xl bg-zinc-50 transition-shadow hover:shadow-md hover:shadow-zinc-900/5 dark:bg-white/2.5 dark:hover:shadow-black/5"
    >
      <ResourcePattern {...resource.pattern} mouseX={mouseX} mouseY={mouseY} />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-zinc-900/7.5 group-hover:ring-zinc-900/10 dark:ring-white/10 dark:group-hover:ring-white/20" />
      <div className="relative rounded-2xl px-4 pb-4 pt-16">
        <ResourceIcon icon={resource.icon} />
        <h3 className="mt-4 text-sm font-semibold leading-7 text-zinc-900 dark:text-white">
          <Link href={resource.href}>
            <span className="absolute inset-0 rounded-2xl" />
            {resource.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {resource.description}
        </p>
      </div>
    </div>
  )
}

export function Resources() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="resources">
        Resources
      </Heading>
      <div className="mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 dark:border-white/5 sm:grid-cols-2 xl:grid-cols-4">
        {resources.map((resource) => (
          <Resource key={resource.href} resource={resource} />
        ))}
      </div>
    </div>
  )
}
