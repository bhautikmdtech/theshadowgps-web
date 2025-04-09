"use client"; // Ensure this runs only on the client

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const ExpiryTimer = ({ expiresAt }: { expiresAt: string }) => {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  
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
    <div className="text-xs text-center m-0">
      <p className="m-0" style={{color: currentTheme === "dark" ? "#9CA3AF" : "#3D4B65"}}>Expires In</p>
      <p className="font-bold text-sm m-0" style={{color: currentTheme === "dark" ? "#E5E7EB" : "#0C1F3F"}}>
        {timeLeft.hours} : {timeLeft.minutes} : {timeLeft.seconds}
      </p>
      <p className="text-sm m-0" style={{color: currentTheme === "dark" ? "#9CA3AF" : "#3D4B65"}}>hour : min : sec</p>
    </div>
  );
};

export default ExpiryTimer;
