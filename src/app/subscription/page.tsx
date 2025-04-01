import { Suspense } from "react";
import SubscriptionViewer from "./SubscriptionViewer";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import axiosClient from "@/lib/axiosClient";

export const metadata: Metadata = {
  title: "Subscription Management",
  description: "Manage your subscription and payment details",
};

type PageProps = { searchParams: { token?: string } };

export default async function SubscriptionPage({ searchParams }: PageProps) {
  const token = searchParams.token;

  // Security check: Redirect if no valid token
  if (!token) {
    redirect("/login?returnUrl=/subscription");
  }

  try {
    // Fetch subscription data with secure headers
    const response = await axiosClient.get(
      "/api/app/subscription/getStripeData",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Cache-Control": "no-store",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    return (
      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-screen">
            Loading...
          </div>
        }
      >
        <SubscriptionViewer token={token} initialData={response.data} />
      </Suspense>
    );
  } catch (error) {
    // Security: Redirect on any error to prevent data exposure
    redirect("/login?returnUrl=/subscription");
  }
}
