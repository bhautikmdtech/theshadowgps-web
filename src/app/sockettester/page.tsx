import type { Metadata } from "next";
import SocketCheckerViewer from "./SocketViewer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Messages",
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SocketCheckerViewer />
    </Suspense>
  );
}
