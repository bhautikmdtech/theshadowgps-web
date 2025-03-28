import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Socket Management",
  description: "Manage your Socket",
};

export default function SocketLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="socket-layout">{children}</div>;
}
