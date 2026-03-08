"use client";

import { useEffect } from "react";
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            navigator.serviceWorker
                .register("/sw.js")
                .catch((error) => {
                    console.log("SW registration failed:", error);
                });
        }
    }, []);

    return <PWAInstallPrompt />;
}
