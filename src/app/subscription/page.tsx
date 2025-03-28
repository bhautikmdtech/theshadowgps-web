import type { Metadata } from "next";
import SubscriptionViewer from "./SubscriptionViewer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Messages",
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubscriptionViewer />
    </Suspense>
  );
}
