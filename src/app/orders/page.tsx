"use client";

import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const OrdersPageContent = dynamic(() => import("@/components/OrdersPageContent"), {
  loading: () => <LoadingScreen />,
});

export default function OrdersPage() {
  return <OrdersPageContent />;
}
