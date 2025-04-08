"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { FaLayerGroup, FaMapMarkerAlt, FaCarSide } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";

interface MapControlsProps {
  map: mapboxgl.Map | null;
  deviceLocation?: { lng: number; lat: number };
}

const MapControls = ({ map, deviceLocation }: MapControlsProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState("streets-v11");
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const mapStyles = [
    {
      type: "streets-v11",
      label: "Road",
      img: "/images/map/road.svg",
    },
    {
      type: "satellite-streets-v11",
      label: "Satellite",
      img: "/images/map/satellite.svg",
    },
    {
      type: currentTheme === "dark" ? "dark-v11" : "light-v11",
      label: currentTheme === "dark" ? "Dark" : "Light",
      img: "/images/map/hybrid.svg",
    },
  ];

  // Update map style when theme changes
  const logMapState = (): boolean => {
    if (!map) {
      console.error("Map instance is null");
      return false;
    }
    if (!map.isStyleLoaded()) {
      console.warn("Map style not loaded yet");
      return false;
    }
    return true;
  };

  const handleLayerToggle = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const changeMapStyle = (style: string) => {
    if (!logMapState()) return;

    setMapStyle(style);
    setIsDropdownOpen(false);

    try {
      map!.setStyle(`mapbox://styles/mapbox/${style}`);

      // Re-add markers after style change
      map!.once("style.load", () => {
        if (markersRef.current.length > 0) {
          const lastPos = markersRef.current[0].getLngLat();
          updateDeviceMarker(lastPos.lng, lastPos.lat);
        }
      });
    } catch (error) {
      console.error("Failed to change map style:", error);
      toast.error("Failed to change map style");
    }
  };

  const updateDeviceMarker = (lng: number, lat: number) => {
    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!map) return;

    const el = document.createElement("div");
    el.className = "device-marker";
    Object.assign(el.style, {
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      backgroundColor: "#4285F4",
      border: "2px solid white",
      boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
    });

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([lng, lat])
      .addTo(map);

    markersRef.current.push(marker);
  };

  const handleDeviceLocationClick = () => {
    if (!logMapState() || !deviceLocation) {
      toast.error("Device location unavailable");
      return;
    }

    try {
      map!.flyTo({
        center: [deviceLocation.lng, deviceLocation.lat],
        zoom: 16,
        essential: true,
      });
    } catch (error) {
      console.error("Failed to fly to device location:", error);
      toast.error("Failed to navigate to device location");
    }
  };

  const handleUserLocationClick = () => {
    if (!logMapState()) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    // Clear any existing watch
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateDeviceMarker(longitude, latitude);

        try {
          map!.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            essential: true,
          });
        } catch (error) {
          console.error("Failed to fly to user location:", error);
        }
      },
      (error) => {
        toast.error(`Location error: ${error.message}`);
        watchIdRef.current = null;
      },
      { enableHighAccuracy: true }
    );
  };
  useEffect(() => {
    if ((map && mapStyle === "dark-v11") || mapStyle === "light-v11") {
      const newStyle = currentTheme === "dark" ? "dark-v11" : "light-v11";
      if (mapStyle !== newStyle) {
        changeMapStyle(newStyle);
      }
    }
  }, [currentTheme]);

  // ... rest of your existing functions remain the same ...

  return (
    <div
      className={`relative mapboxgl-ctrl mapboxgl-ctrl-group flex flex-col gap-2 p-2 ${
        currentTheme === "dark" ? "bg-gray-800" : "bg-white"
      } rounded-lg shadow-lg`}
    >
      {/* Map Type Button */}
      <div className="relative">
        <button
          onClick={handleLayerToggle}
          className={`map-control-btn ${
            currentTheme === "dark"
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-800"
          }`}
          aria-label="Change map style"
          aria-expanded={isDropdownOpen}
        >
          <FaLayerGroup size={18} />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            className={`absolute right-0 bottom-full mb-2 ${
              currentTheme === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-200"
            } border rounded-lg z-50 p-2 flex gap-2 shadow-md`}
          >
            {mapStyles.map(({ type, label, img }) => (
              <button
                key={type}
                onClick={() => changeMapStyle(type)}
                className={`flex flex-col items-center ${
                  currentTheme === "dark" ? "bg-gray-700" : "bg-white"
                } w-50 h-50 border-0 p-2 rounded-lg transition hover:shadow-lg ${
                  mapStyle === type
                    ? "border-4 border-blue-500 shadow-md"
                    : currentTheme === "dark"
                    ? "border-gray-600"
                    : "border-gray-300"
                }`}
                aria-label={`Switch to ${label} map`}
              >
                <img
                  src={img}
                  alt={label}
                  className="rounded-lg object-cover w-16 h-16"
                />
                <span
                  className={`text-sm mt-1 ${
                    currentTheme === "dark" ? "text-white" : "text-gray-800"
                  }`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Move to Device Location */}
      <button
        onClick={handleDeviceLocationClick}
        className={`map-control-btn ${
          currentTheme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-gray-100 hover:bg-gray-200 text-gray-800"
        }`}
        title="Move to Device Location"
        aria-label="Move to device location"
      >
        <FaCarSide size={18} />
      </button>

      {/* Move to User Location */}
      <button
        onClick={handleUserLocationClick}
        className={`map-control-btn ${
          currentTheme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-gray-100 hover:bg-gray-200 text-gray-800"
        }`}
        title="Move to My Location"
        aria-label="Move to my location"
      >
        <FaMapMarkerAlt size={18} />
      </button>
    </div>
  );
};

export default MapControls;
