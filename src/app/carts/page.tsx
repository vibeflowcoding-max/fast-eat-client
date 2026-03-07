"use client";

import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const CartsPageContent = dynamic(() => import('@/components/CartsPageContent'), {
  loading: () => <LoadingScreen />,
});

export default function CartsPage() {
  return <CartsPageContent />;
}