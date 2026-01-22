import "../styles/globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "CreatorScout",
  description: "Discover YouTube creators instantly from the public API."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
