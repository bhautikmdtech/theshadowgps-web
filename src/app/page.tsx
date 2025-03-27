"use client";
import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Socket Checker</h1>
      <div className="flex flex-col gap-4">
        <Link 
          href="/share-location" 
          className="p-4 bg-blue-100 hover:bg-blue-200 rounded-md border border-blue-300"
        >
          Share Location Page
        </Link>
        {/* Add other links as needed */}
      </div>
    </div>
  );
}
