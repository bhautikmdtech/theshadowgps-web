import type { Metadata } from "next";
import SocketCheckerViewer from "./SocketView";

export const metadata: Metadata = {
  title: "Messages",
};

export default function Page() {
  return <SocketCheckerViewer />;
}
