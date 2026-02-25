import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import RouteTransitionIndicator from "@/components/RouteTransitionIndicator";
import AuthBootstrap from "@/components/AuthBootstrap";
import I18nProvider from '@/components/providers/I18nProvider';

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
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
            </head>
            <body>
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
