import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import RouteTransitionIndicator from "@/components/RouteTransitionIndicator";

export const metadata: Metadata = {
    title: "FastEat - Ordena comida rápido",
    description: "Ordena comida de tus restaurantes favoritos cerca de ti.",
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
        <html lang="es">
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
            </head>
            <body>
                <RouteTransitionIndicator />
                {children}
                <ServiceWorkerRegistration />
            </body>
        </html>
    );
}
