import { Suspense } from "react";
import SubscriptionViewer from "./components/SubscriptionViewer";
import { Metadata } from "next";
import axiosClient from "@/lib/axiosClient";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Subscription Management",
  description: "Manage your subscription and payment details",
};

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) {
  const token = (await searchParams).token;

  if (!token) {
    redirect("/login?returnUrl=/subscription");
  }

  try {
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
    redirect("/login?returnUrl=/subscription");
  }
}
