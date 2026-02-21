"use client";

import { Suspense } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import HomePage from '@/components/HomePage';

export default function Home() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <HomePage />
        </Suspense>
    );
}
