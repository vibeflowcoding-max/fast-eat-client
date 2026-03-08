"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const HomePage = dynamic(() => import('@/components/HomePage'), {
    loading: () => <LoadingScreen />,
});

export default function Home() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <HomePage />
        </Suspense>
    );
}
