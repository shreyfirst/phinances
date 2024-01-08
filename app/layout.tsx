import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { MantineProvider, ColorSchemeScript, rem } from '@mantine/core';
import Head from 'next/head';
import '@mantine/core/styles.layer.css';
import 'mantine-datatable/styles.layer.css';

const inter = Inter({ subsets: ['latin'] })
const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'


export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Phinances Portal',
  description: 'Billing & reimbursements for Phi Delta Theta',
  icons: {
    icon: '/icon.png'
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {


  return (
    <html lang="en">
      <Head>
        <ColorSchemeScript />
        <meta name="viewport" content="width=device-width, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
        {/* <meta name="viewport" content="width=device-width, initial-scale=1"/> */}
      </Head>
      <body className={inter.className}>
        <MantineProvider
        defaultColorScheme="auto"
        theme={{
          scale: 1,
          fontSizes: {
            // xs: rem(14),
            // sm: rem(16),
            // md: rem(20),
            // lg: rem(24),
            // xl: rem(28),
          },
        }}
        >
          {children}
        </MantineProvider>
      </body>
    </html>
  )
}
