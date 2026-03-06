"use client";

import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const SearchPageContent = dynamic(() => import("@/components/SearchPageContent"), {
  loading: () => <LoadingScreen />,
});

export default function SearchPage() {
  return <SearchPageContent />;
}
