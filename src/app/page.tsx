"use client";

import React, { Suspense } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import MainApp from '@/components/MainApp';

export default function Home() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <MainApp />
        </Suspense>
    );
}
