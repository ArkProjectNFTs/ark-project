import glob from 'fast-glob'

import { Providers } from '@/app/providers'
import { Layout } from '@/components/Layout'

import '@/styles/tailwind.css'
import { type Metadata } from 'next'
import { type Section } from '@/components/SectionProvider'
import Script from 'next/script'
import clsx from 'clsx'
import { arkProjectFont, styreneAFont } from '@/fonts'

export const metadata: Metadata = {
  title: {
    template: '%s - Documentation ArkProject',
    default: 'Documentation ArkProject',
  },
  description:
    'Unlock the potential of the ArkProject global infrastructure for digital assets exchange with our ultimate guide, documentation and API references.',
  twitter: {
    title: 'Documentation ArkProject',
    card: 'summary_large_image',
    site: '@ArkProjectNFTs',
    creator: '@ArkProjectNFTs',
    description: '',
    images: ['https://docs.arkproject.dev/assets/arkproject_doc_thumbnail.png'],
  },
  openGraph: {
    title: 'Documentation ArkProject',
    description: '',
    url: 'https://docs.arkproject.dev',
    type: 'website',
    images: ['https://docs.arkproject.dev/assets/arkproject_doc_thumbnail.png'],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let pages = await glob('**/*.mdx', { cwd: 'src/app' })
  let allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`./${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  let allSections = Object.fromEntries(allSectionsEntries)

  return (
    <>
      <html lang="en" className="h-full" suppressHydrationWarning>
        <Script src="/scripts/hotjar.js" />
        <body
          className={clsx(
            'flex min-h-full bg-white font-styrene-a antialiased dark:bg-void-black',
            arkProjectFont.variable,
            styreneAFont.variable,
          )}
        >
          <Providers>
            <div className="w-full">
              <Layout allSections={allSections}>{children}</Layout>
            </div>
          </Providers>
        </body>
      </html>
    </>
  )
}
