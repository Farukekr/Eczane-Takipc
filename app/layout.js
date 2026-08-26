import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Eczane Takip Sistemi',
  description: 'Eczane hasta ve reçete takip uygulaması',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        <Toaster position="top-right" reverseOrder={false} />
        {children}
      </body>
    </html>
  );
}
