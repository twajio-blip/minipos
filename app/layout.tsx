import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Lite POS",description:"Lightweight sales and customer ledger POS"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
