import type { Metadata } from "next";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/subscription.css";
import "../../styles/mapBox.css";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  title: "Share Location Management",
  description: "Manage your Share Location",
};

export default function ShareLocationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="share-location-layout">{children}</div>;
}
