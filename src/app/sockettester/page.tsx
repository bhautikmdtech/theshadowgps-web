import type { Metadata } from "next";
import SocketCheckerViewer from "./SocketViewer";

export const metadata: Metadata = {
  title: "Messages",
};

export default function Page() {
  return <SocketCheckerViewer />;
}
