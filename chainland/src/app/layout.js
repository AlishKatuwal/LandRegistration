import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
export const metadata = {
  title: 'ChainLand — Nepal Digital Land Registry | नेपाल डिजिटल भूमि अभिलेख',
  description: 'Government-grade blockchain-secured digital land registry for Nepal. Register, verify, and transfer land ownership securely.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
