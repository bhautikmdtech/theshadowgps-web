import type { Metadata } from "next";
import SubscriptionViewer from "./SubscriptionViewer";

export const metadata: Metadata = {
  title: "Messages",
};

export default function Page() {
  return <SubscriptionViewer />;
}
