import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURA - Autonomous Quantitative Stock Broker',
  description: 'Autonomous Hybrid AI & Quantitative Stock Broking Engine with Interactive Brokers Integration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080b11] text-slate-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
