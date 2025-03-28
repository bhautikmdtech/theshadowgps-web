import type { Metadata } from "next";
import ShareLocationViewer from "./ShareLocationViewer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Messages",
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShareLocationViewer />
    </Suspense>
  );
}
