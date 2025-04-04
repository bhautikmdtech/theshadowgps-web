import type { Metadata } from "next";
import ShareLocationViewer from "./components/ShareLocationViewer";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import axiosClient from "@/lib/axiosClient";

export const metadata: Metadata = {
  title: "Location Sharing",
  description: "View shared location tracking data",
};

export default async function ShareLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) {
  const shareToken = (await searchParams).token;

  if (!shareToken) {
    redirect("/");
  }

  try {
    // Fetch location data with appropriate headers
    const response = await axiosClient.get(
      `/api/common/getSharedLocation/${shareToken}`,
      {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-store",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
    // Check if the response contains valid data
    if (!response.data || !response.data.data) {
      throw new Error("Invalid data received");
    }

    return (
      <Suspense
        fallback={
          <div className="h-full bg-gray-100 flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: "#f8f9fa",
                  backgroundImage:
                    "linear-gradient(rgba(230, 230, 230, 0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(230, 230, 230, 0.7) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              ></div>

              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 loading-progress"></div>
            </div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white py-3 px-5 rounded-lg shadow-md flex items-center">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-3"></div>
              <span className="text-gray-700">Loading map...</span>
            </div>
          </div>
        }
      >
        <ShareLocationViewer
          shareToken={shareToken}
          initialData={response.data.data}
        />
      </Suspense>
    );
  } catch (error) {
    // In case of error, render error UI instead of redirecting
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 mb-4 text-5xl flex justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-16 h-16"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Location Unavailable
          </h2>
          <p className="text-gray-600 mb-4">
            This location share link is invalid or has expired.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }
}
