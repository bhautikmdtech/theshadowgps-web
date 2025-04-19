import { Suspense } from "react";
import SubscriptionViewer from "./components/SubscriptionViewer";
import { Metadata } from "next";
import axiosClient from "@/lib/axiosClient";
import Link from "next/link";

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

    if (!response.data || !response.data) {
      throw new Error("Invalid data received");
    }

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
  } catch (error: any) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            subscription Unavailable
          </h2>
          <p className="text-gray-600 mb-4">
            This subscription link is invalid or has no subscription.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }
}
