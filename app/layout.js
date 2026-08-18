export const metadata = {
  title: 'Eczane Takip',
  description: 'Eczane Hasta ve Reçete Takip Sistemi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 min-h-screen text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
