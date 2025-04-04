import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { toast } from "react-toastify";
import { FaCrosshairs } from "react-icons/fa";
import { PageLoader } from "@/components";

interface BrowserLocationMarkerProps {
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
}

const BrowserLocationMarker = ({ mapRef }: BrowserLocationMarkerProps) => {
  const browserLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [showBrowserLocation, setShowBrowserLocation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !showBrowserLocation) {
      if (browserLocationMarkerRef.current) {
        browserLocationMarkerRef.current.remove();
        browserLocationMarkerRef.current = null;
      }
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (!browserLocationMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "browser-location-marker";
          el.style.width = "16px";
          el.style.height = "16px";
          el.style.borderRadius = "50%";
          el.style.backgroundColor = "#4285F4";
          el.style.border = "2px solid white";
          el.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";

          browserLocationMarkerRef.current = new mapboxgl.Marker({
            element: el,
            anchor: "center",
          })
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current!);
        } else {
          browserLocationMarkerRef.current.setLngLat([longitude, latitude]);
        }

        // Move map to user's location
        mapRef.current!.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true,
        });

        setIsProcessing(false);
      },
      (error) => {
        toast.error(`Location error: ${error.message}`);
        setShowBrowserLocation(false);
        setIsProcessing(false);
      },
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (browserLocationMarkerRef.current) {
        browserLocationMarkerRef.current.remove();
        browserLocationMarkerRef.current = null;
      }
    };
  }, [showBrowserLocation, mapRef]);

  const toggleBrowserLocation = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setShowBrowserLocation((prev) => !prev);
  };

  return (
    <button
      onClick={toggleBrowserLocation}
      className={`p-2 rounded flex items-center ${
        showBrowserLocation
          ? "bg-blue-500 text-white"
          : "bg-gray-200 text-gray-700"
      }`}
      title="Show my location"
    >
      {isProcessing ? (
        <>
          <PageLoader type="spinner" color="#007bff" />
          Processing...
        </>
      ) : (
        <FaCrosshairs className="h-4 w-4" />
      )}
    </button>
  );
};

export default BrowserLocationMarker;
