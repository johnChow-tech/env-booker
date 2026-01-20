import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from "antd";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Env Booker",
  description: "Dev Environment Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AntdRegistry> 
          <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
            {children}
          </ConfigProvider>
        </AntdRegistry>

      </body>
    </html>
  );
}