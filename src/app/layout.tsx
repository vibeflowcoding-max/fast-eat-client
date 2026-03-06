import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google';
import { Suspense } from "react";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import RouteTransitionIndicator from "@/components/RouteTransitionIndicator";
import AuthBootstrap from "@/components/AuthBootstrap";
import I18nProvider from '@/components/providers/I18nProvider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
    title: "FastEat - Order food fast",
    description: "Order food from your favorite restaurants near you.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "FastEat",
    },
};

export const viewport: Viewport = {
    themeColor: "#dc2626",
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="apple-touch-icon" href="/placeholder-restaurant.svg" />
            </head>
            <body className={inter.className}>
                <I18nProvider>
                    <Suspense fallback={null}>
                        <RouteTransitionIndicator />
                    </Suspense>
                    <AuthBootstrap />
                    {children}
                    <ServiceWorkerRegistration />
                </I18nProvider>
            </body>
        </html>
    );
}
