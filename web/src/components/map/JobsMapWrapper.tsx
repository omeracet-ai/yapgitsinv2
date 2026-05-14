'use client';

import dynamic from 'next/dynamic';

const JobsMap = dynamic(() => import('./JobsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] bg-gray-100 rounded-2xl animate-pulse" />
  ),
});

export default function JobsMapWrapper() {
  return <JobsMap />;
}
