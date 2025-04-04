"use client"; // Ensure this runs only on the client

import { useEffect, useState } from "react";

const ExpiryTimer = ({ expiresAt }: { expiresAt: string }) => {
  
  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
  } | null>(null);

  useEffect(() => {
    // Function to calculate time left
    const calculateTimeLeft = () => {
      const expiryTime = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const difference = expiryTime - now;

      if (difference <= 0) return { hours: "00", minutes: "00", seconds: "00" };

      const hours = String(Math.floor(difference / (1000 * 60 * 60))).padStart(
        2,
        "0"
      );
      const minutes = String(
        Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      ).padStart(2, "0");
      const seconds = String(
        Math.floor((difference % (1000 * 60)) / 1000)
      ).padStart(2, "0");

      return { hours, minutes, seconds };
    };

    // Set initial state on client
    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return null; // Prevents SSR mismatch

  return (
    <div className="text-xs text-gray-500 text-center m-0">
      <p className="font-semibold m-0">Expires In</p>
      <p className="text-black font-bold text-sm m-0">
        {timeLeft.hours} : {timeLeft.minutes} : {timeLeft.seconds}
      </p>
      <p className="text-black text-sm m-0">hour : min : sec</p>
    </div>
  );
};

export default ExpiryTimer;
