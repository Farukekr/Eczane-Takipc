import Script from 'next/script';

export const metadata = {
  title: 'Eczane Takip System',
  description: 'Eczane Hasta ve Reçete Takip',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body className="bg-gray-100 text-gray-900 min-h-screen antialiased">
        <main className="max-w-4xl mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
