'use client'

import clsx from 'clsx'
import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'

import { Button } from '@/components/Button'
import { useIsInsideMobileNavigation } from '@/components/MobileNavigation'
import { useSectionStore } from '@/components/SectionProvider'
import { Tag } from '@/components/Tag'
import { remToPx } from '@/lib/remToPx'
import { useIntercom } from 'react-use-intercom'

interface NavGroup {
  title: string
  links: Array<{
    title: string
    href: string
  }>
}

function useInitialValue<T>(value: T, condition = true) {
  let initialValue = useRef(value).current
  return condition ? initialValue : value
}

function TopLevelNavItem({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li className="md:hidden">
      <Link
        href={href}
        className="block py-1 text-sm text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        {children}
      </Link>
    </li>
  )
}

function TopLevelNavButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <li className="md:hidden">
      <Button
        variant="text"
        onClick={onClick}
        className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        {children}
      </Button>
    </li>
  )
}

function NavLink({
  href,
  children,
  tag,
  active = false,
  isAnchorLink = false,
}: {
  href: string
  children: React.ReactNode
  tag?: string
  active?: boolean
  isAnchorLink?: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex justify-between gap-2 py-1 pr-3 text-sm transition',
        isAnchorLink ? 'pl-7' : 'pl-4',
        active
          ? 'text-zinc-900 dark:text-white'
          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
      )}
    >
      <span className="truncate">{children}</span>
      {tag && (
        <Tag variant="small" color="zinc">
          {tag}
        </Tag>
      )}
    </Link>
  )
}

function VisibleSectionHighlight({
  group,
  pathname,
}: {
  group: NavGroup
  pathname: string
}) {
  let [sections, visibleSections] = useInitialValue(
    [
      useSectionStore((s) => s.sections),
      useSectionStore((s) => s.visibleSections),
    ],
    useIsInsideMobileNavigation(),
  )

  let isPresent = useIsPresent()
  let firstVisibleSectionIndex = Math.max(
    0,
    [{ id: '_top' }, ...sections].findIndex(
      (section) => section.id === visibleSections[0],
    ),
  )
  let itemHeight = remToPx(2)
  let height = isPresent
    ? Math.max(1, visibleSections.length) * itemHeight
    : itemHeight
  let top =
    group.links.findIndex((link) => link.href === pathname) * itemHeight +
    firstVisibleSectionIndex * itemHeight

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.2 } }}
      exit={{ opacity: 0 }}
      className="absolute inset-x-0 top-0 bg-zinc-800/2.5 will-change-transform dark:bg-white/2.5"
      style={{ borderRadius: 8, height, top }}
    />
  )
}

function ActivePageMarker({
  group,
  pathname,
}: {
  group: NavGroup
  pathname: string
}) {
  let itemHeight = remToPx(2)
  let offset = remToPx(0.25)
  let activePageIndex = group.links.findIndex((link) => link.href === pathname)
  let top = offset + activePageIndex * itemHeight

  return (
    <motion.div
      layout
      className="absolute left-2 h-6 w-px bg-space-blue-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.2 } }}
      exit={{ opacity: 0 }}
      style={{ top }}
    />
  )
}

function NavigationGroup({
  group,
  className,
}: {
  group: NavGroup
  className?: string
}) {
  // If this is the mobile navigation then we always render the initial
  // state, so that the state does not change during the close animation.
  // The state will still update when we re-open (re-render) the navigation.
  let isInsideMobileNavigation = useIsInsideMobileNavigation()
  let [pathname, sections] = useInitialValue(
    [usePathname(), useSectionStore((s) => s.sections)],
    isInsideMobileNavigation,
  )

  let isActiveGroup =
    group.links.findIndex((link) => link.href === pathname) !== -1

  return (
    <li className={clsx('relative mt-6', className)}>
      <motion.h2
        layout="position"
        className="text-md font-semibold text-zinc-900 dark:text-white"
      >
        {group.title}
      </motion.h2>
      <div className="relative mt-3 pl-2">
        <AnimatePresence initial={!isInsideMobileNavigation}>
          {isActiveGroup && (
            <VisibleSectionHighlight group={group} pathname={pathname} />
          )}
        </AnimatePresence>
        <motion.div
          layout
          className="absolute inset-y-0 left-2 w-px bg-zinc-900/10 dark:bg-white/5"
        />
        <AnimatePresence initial={false}>
          {isActiveGroup && (
            <ActivePageMarker group={group} pathname={pathname} />
          )}
        </AnimatePresence>
        <ul role="list" className="border-l border-transparent">
          {group.links.map((link) => (
            <motion.li key={link.href} layout="position" className="relative">
              <NavLink href={link.href} active={link.href === pathname}>
                {link.title}
              </NavLink>
              <AnimatePresence mode="popLayout" initial={false}>
                {link.href === pathname && sections.length > 0 && (
                  <motion.ul
                    role="list"
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      transition: { delay: 0.1 },
                    }}
                    exit={{
                      opacity: 0,
                      transition: { duration: 0.15 },
                    }}
                  >
                    {sections.map((section) => (
                      <li key={section.id}>
                        <NavLink
                          href={`${link.href}#${section.id}`}
                          tag={section.tag}
                          isAnchorLink
                        >
                          {section.title}
                        </NavLink>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </ul>
      </div>
    </li>
  )
}

export const navigation: Array<NavGroup> = [
  {
    title: 'Overview',
    links: [
      { title: 'Introduction', href: '/' },
      // { title: 'What is the Ark project ?', href: '/arkproject' },
      // { title: 'Arkchain', href: '/arkchain' },
      // { title: 'Orderbook', href: '/orderbook' },
      // { title: 'Smart contracts', href: '/smartcontracts' },
    ],
  },
  {
    title: 'API Guides',
    links: [
      { title: 'Quickstart', href: '/quickstart' },
      { title: 'Authentication', href: '/authentication' },
      { title: 'Pagination', href: '/pagination' },
      { title: 'Errors', href: '/errors' },
    ],
  },
  {
    title: 'NFT API',
    links: [
      { title: 'Introduction', href: '/nft-api-introduction' },
      { title: 'NFT Contracts', href: '/nft-contracts' },
      { title: 'Tokens', href: '/tokens' },
      { title: 'Events', href: '/events' },
      { title: 'NFT Portfolio', href: '/portfolio' },
    ],
  },
  {
    title: 'Orderbook API',
    links: [
      { title: 'Introduction', href: '/orderbook-api-introduction' },
      { title: 'Tokens', href: '/orderbook-api/tokens' },
      { title: 'Events', href: '/orderbook-api/events' },
      { title: 'Offers', href: '/orderbook-api/offers' },
    ],
  },
  {
    title: 'Marketplace API',
    links: [
      { title: 'Introduction', href: '/marketplace-api-introduction' },
      { title: 'Collections', href: '/marketplace-api/collections' },
      { title: 'Tokens', href: '/marketplace-api/tokens' },
    ],
  },
  {
    title: 'SDK Core',
    links: [
      { title: 'Installation', href: '/sdk-core/installation' },
      { title: 'Getting started', href: '/sdk-core/getting-started' },
      { title: 'Configuration', href: '/sdk-core/configuration' },
      {
        title: 'cancelOrder',
        href: '/sdk-core/cancel-order',
      },
      {
        title: 'createAuction',
        href: '/sdk-core/create-auction',
      },
      {
        title: 'createCollectionOffer',
        href: '/sdk-core/create-collection-offer',
      },
      {
        title: 'createListing',
        href: '/sdk-core/create-listing',
      },
      {
        title: 'createOffer',
        href: '/sdk-core/create-offer',
      },
      {
        title: 'fulfillAuction',
        href: '/sdk-core/fulfill-auction',
      },
      {
        title: 'fulfillCollectionOffer',
        href: '/sdk-core/fulfill-collection-offer',
      },
      {
        title: 'fulfillListing',
        href: '/sdk-core/fulfill-listing',
      },
      {
        title: 'fulfillOffer',
        href: '/sdk-core/fulfill-offer',
      },
      {
        title: 'getNftOwner',
        href: '/sdk-core/get-nft-owner',
      },
      {
        title: 'getOrder',
        href: '/sdk-core/get-order',
      },
      {
        title: 'getOrderHash',
        href: '/sdk-core/get-order-hash',
      },
      {
        title: 'getOrderSigner',
        href: '/sdk-core/get-order-signer',
      },
      {
        title: 'getOrderStatus',
        href: '/sdk-core/get-order-status',
      },
      {
        title: 'getOrderType',
        href: '/sdk-core/get-order-type',
      },
    ],
  },
  {
    title: 'SDK React',
    links: [
      { title: 'Getting started', href: '/sdk-react/getting-started' },
      { title: 'useCancel', href: '/sdk-react/use-cancel' },
      { title: 'useConfig', href: '/sdk-react/use-config' },
      { title: 'useCreateAuction', href: '/sdk-react/use-create-auction' },
      { title: 'useCreateListing', href: '/sdk-react/use-create-listing' },
      {
        title: 'useCreateCollectionOffer',
        href: '/sdk-react/use-create-collection-offer',
      },
      { title: 'useCreateOffer', href: '/sdk-react/use-create-offer' },
      { title: 'useFulfillAuction', href: '/sdk-react/use-fulfill-auction' },
      {
        title: 'useFulfillCollectionOffer',
        href: '/sdk-react/use-fulfill-collection-offer',
      },
      { title: 'useFulfillListing', href: '/sdk-react/use-fulfill-listing' },
      { title: 'useFulfillOffer', href: '/sdk-react/use-fulfill-offer' },
    ],
  },
]

export function Navigation(props: React.ComponentPropsWithoutRef<'nav'>) {
  const { show } = useIntercom()

  return (
    <nav {...props}>
      <ul role="list">
        <TopLevelNavButton onClick={show}>Support</TopLevelNavButton>
        <TopLevelNavItem href="https://github.com/arkProjectNFTs">
          Github
        </TopLevelNavItem>
        {navigation.map((group, groupIndex) => (
          <NavigationGroup
            key={group.title}
            group={group}
            className={groupIndex === 0 ? 'md:mt-0' : ''}
          />
        ))}
        <li className="sticky bottom-0 z-10 mt-6 min-[416px]:hidden">
          <Button href="#" variant="filled" className="w-full">
            Sign in
          </Button>
        </li>
      </ul>
    </nav>
  )
}
