import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from "react";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import RouteTransitionIndicator from "@/components/RouteTransitionIndicator";
import AuthBootstrap from "@/components/AuthBootstrap";
import I18nProvider from '@/components/providers/I18nProvider';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
    title: "FastEat - Order food fast",
    description: "Order food from your favorite restaurants near you.",
    manifest: "/manifest.json",
    icons: {
        icon: [
            { url: "/icons/fasteat-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/fasteat-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icons/fasteat-180.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "FastEat",
    },
};

export const viewport: Viewport = {
    themeColor: "#ec5b13",
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
                <link rel="apple-touch-icon" sizes="180x180" href="/icons/fasteat-180.png" />
            </head>
            <body className={plusJakartaSans.className}>
                <I18nProvider>
                    <Suspense fallback={null}>
                        <RouteTransitionIndicator />
                    </Suspense>
                    <Suspense fallback={null}>
                        <AuthBootstrap />
                    </Suspense>
                    {children}
                    <ServiceWorkerRegistration />
                </I18nProvider>
            </body>
        </html>
    );
}
