import type { Metadata } from "next";
import ShareLocationViewer from "./ShareLocationViewer";

export const metadata: Metadata = {
  title: "Messages",
};

export default function Page() {
  return <ShareLocationViewer />;
}
