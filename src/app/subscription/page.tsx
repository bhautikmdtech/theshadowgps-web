"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ThreeDots } from 'react-loader-spinner';

// Use dynamic import for client components
const SubscriptionViewer = dynamic(
  () => import('./SubscriptionViewer'),
  {
    loading: () => (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <ThreeDots
          height="80"
          width="80"
          radius="9"
          color="#4fa94d"
          ariaLabel="three-dots-loading"
          visible={true}
        />
      </div>
    ),
    ssr: false
  }
);

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <ThreeDots
          height="80"
          width="80"
          radius="9"
          color="#4fa94d"
          ariaLabel="three-dots-loading"
          visible={true}
        />
      </div>
    }>
      <SubscriptionViewer />
    </Suspense>
  );
}
