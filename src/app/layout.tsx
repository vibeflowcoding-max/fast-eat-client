import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Izakaya Zen - Menú Digital",
    description: "Disfruta de la mejor comida japonesa con nuestro menú digital interactivo.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}
