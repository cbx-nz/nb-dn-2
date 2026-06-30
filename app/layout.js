import './globals.css';

export const metadata = {
  title: 'No Bloat Daily News',
  description: 'A minimal daily news site with Redis-backed reports and RSS.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}