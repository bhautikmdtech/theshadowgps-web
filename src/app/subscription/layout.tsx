import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/subscription.css"; 

export const metadata: Metadata = {
  title: "Subscription Management",
  description: "Manage your subscriptions and billing information",
};

export default function SubscriptionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="subscription-layout"> 
      {children}
    </div>
  );
}
