import "../styles/globals.css";
import { ReactNode } from "react";
import SessionProvider from "../components/SessionProvider";

export const metadata = {
  title: "CreatorScout",
  description: "Discover YouTube creators and track them in Google Sheets."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
