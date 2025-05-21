"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import Image from "next/image";

export const MAPBOX_LIGHT =
  "mapbox://styles/abhishekbhatia02/cm7ektl0a006601r3ednqdyxu";
export const MAPBOX_DARK =
  "mapbox://styles/abhishekbhatia02/cm7el93sj00i901s7gawghy7j";

interface MapControlsProps {
  map: mapboxgl.Map | null;
  deviceLocation?: { lng: number; lat: number };
  deviceLocationActive: boolean;
  setDeviceLocationActive: (active: boolean) => void;
}

const MapControls = ({
  map,
  deviceLocation,
  deviceLocationActive,
  setDeviceLocationActive,
}: MapControlsProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState("streets-v11");
  const [activeUserButton, setActiveUserButton] = useState<boolean>(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const mapStyles = [
    {
      id: "custom-default",
      type: currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT,
      label: "Road",
      img: "/images/map/road.svg",
    },
    {
      id: "satellite-streets",
      type: "mapbox://styles/mapbox/satellite-v9",
      label: "Satellite",
      img: "/images/map/satellite.svg",
    },
    {
      id: "theme-toggle",
      type: "mapbox://styles/mapbox/satellite-streets-v11",
      label: "Hybrid",
      img: "/images/map/hybrid.svg",
    },
  ];

  const whenMapReady = (operation: () => void) => {
    if (!map) {
      return;
    }

    if (!map.isStyleLoaded()) {
      map.once("style.load", operation);
      return;
    }

    operation();
  };

  const handleLayerToggle = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const changeMapStyle = (styleUrl: string) => {
    if (!map) {
      setMapStyle(styleUrl);
      setIsDropdownOpen(false);
      return;
    }

    setMapStyle(styleUrl);
    setIsDropdownOpen(false);

    whenMapReady(() => {
      try {
        map.setStyle(styleUrl);
        map.once("style.load", () => {
          if (markersRef.current.length > 0) {
            const lastPos = markersRef.current[0].getLngLat();
            updateDeviceMarker(lastPos.lng, lastPos.lat);
          }
        });
      } catch (error) {
        console.error("Failed to change map style:", error);
        toast.error("Failed to change map style");
      }
    });
  };

  const updateDeviceMarker = (lng: number, lat: number) => {
    // Clear any existing markers
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
    if (!deviceLocation) {
      toast.error("Device location unavailable");
      return;
    }

    // If user location is active, deactivate it
    if (activeUserButton) {
      // Clear user location tracking
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Clear markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Reset user button state
      setActiveUserButton(false);
    }

    // Toggle device location active state
    const newDeviceActive = !deviceLocationActive;
    setDeviceLocationActive(newDeviceActive);

    // If turning on device tracking, fly to device location
    if (newDeviceActive) {
      whenMapReady(() => {
        try {
          if (map) {
            // Add the marker to the map
            updateDeviceMarker(deviceLocation.lng, deviceLocation.lat);

            // Fly to the device location
            map.flyTo({
              center: [deviceLocation.lng, deviceLocation.lat],
              zoom: 16,
              essential: true,
              duration: 500,
            });
          }
        } catch (error) {
          console.error("Failed to fly to device location:", error);
          toast.error("Failed to navigate to device location");
        }
      });
    }
  };

  const handleUserLocationClick = () => {
    // Always turn off device tracking when user location is clicked
    setDeviceLocationActive(false);

    // Toggle user location tracking
    const newUserActive = !activeUserButton;
    setActiveUserButton(newUserActive);

    // If turning off user tracking, clean up
    if (!newUserActive) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Clear markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      return;
    }

    // Check if geolocation is available
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      setActiveUserButton(false);
      return;
    }

    // Need map for user location tracking
    if (!map) {
      toast.info("Map is loading. Please try again in a moment.");
      setActiveUserButton(false);
      return;
    }

    // Clear previous watcher if exists
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Clear existing markers before adding new ones
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Start watching user location
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const bounds = new mapboxgl.LngLatBounds();

        if (deviceLocation?.lng && deviceLocation?.lat) {
          bounds.extend([deviceLocation?.lng, deviceLocation?.lat]);
        }
        bounds.extend([longitude, latitude]);
        updateDeviceMarker(longitude, latitude);

        try {
          map.fitBounds(bounds, {
            padding: 100,
            maxZoom: 16,
            duration: 500,
          });
        } catch (error) {
          console.error("Failed to adjust map view:", error);
        }
      },
      (error) => {
        toast.error(`Location error: ${error.message}`);
        watchIdRef.current = null;
        setActiveUserButton(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Update mapStyle when theme changes
  useEffect(() => {
    const themeStyleUrl = currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT;
    if (map && mapStyle !== themeStyleUrl) {
      whenMapReady(() => {
        changeMapStyle(mapStyle);
      });
    }
  }, [mapStyle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fixed right-2 bottom-[100px] md:bottom-[10px] md:right-4 flex flex-col gap-2 z-10">
      <div ref={dropdownRef} className="relative">
        <button
          onClick={handleLayerToggle}
          className={`map-control-btn w-8 h-8 rounded-lg flex items-center justify-center
            ${
              currentTheme === "dark"
                ? `${
                    isDropdownOpen
                      ? "bg-blue-500 text-white"
                      : "bg-black hover:bg-gray-800 text-white"
                  }`
                : `${
                    isDropdownOpen
                      ? "bg-blue-500 text-white"
                      : "bg-white hover:bg-gray-100 text-gray-800"
                  }`
            }`}
          aria-label="Change map style"
          aria-expanded={isDropdownOpen}
        >
          <Image
            src={
              isDropdownOpen
                ? "/images/map/layer-white.svg"
                : "/images/map/layer.svg"
            }
            alt={"Change map style"}
            width={20}
            height={20}
            className="object-contain"
          />
        </button>

        {isDropdownOpen && (
          <div
            className={`absolute right-0 bottom-full mb-2 ${
              currentTheme === "dark"
                ? "bg-black border-gray-600 text-white"
                : "bg-white border-gray-200 text-gray-800"
            } border rounded-lg z-50 p-4 flex flex-col gap-4 shadow-md`}
          >
            <h3 className="text-lg font-semibold text-center">
              Map Appearance
            </h3>
            <div className="flex gap-4">
              {mapStyles.map(({ id, type, label, img }) => (
                <button
                  key={id}
                  onClick={() => changeMapStyle(type)}
                  className="dropdown-button w-24 h-20 rounded-lg flex flex-col items-center justify-center p-1"
                  aria-label={`Switch to ${label} map`}
                >
                  <Image
                    src={img}
                    alt={label}
                    width={60}
                    height={40}
                    className={`rounded-lg object-cover w-full h-full ${
                      mapStyle === type
                        ? "border-4 border-blue-500"
                        : "border border-transparent"
                    }`}
                  />
                  <span className="mt-1 text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        onClick={handleDeviceLocationClick}
        className={`map-control-btn w-8 h-8 rounded-lg flex items-center justify-center
          ${
            currentTheme === "dark"
              ? `${
                  deviceLocationActive
                    ? "bg-blue-500 text-white"
                    : "bg-black hover:bg-gray-800 text-white"
                }`
              : `${
                  deviceLocationActive
                    ? "bg-blue-500 text-white"
                    : "bg-white hover:bg-gray-100 text-gray-800"
                }`
          }`}
        title="Move to Device Location"
        aria-label="Move to device location"
      >
        <Image
          src={
            deviceLocationActive
              ? "/images/map/singal-car-white.svg"
              : "/images/map/car.svg"
          }
          alt={"Device Location"}
          width={24}
          height={24}
          className="object-contain"
        />
      </button>
      <button
        onClick={handleUserLocationClick}
        className={`map-control-btn w-8 h-8 rounded-lg flex items-center justify-center
          ${
            currentTheme === "dark"
              ? `${
                  activeUserButton
                    ? "bg-blue-500 text-white"
                    : "bg-black hover:bg-gray-800 text-white"
                }`
              : `${
                  activeUserButton
                    ? "bg-blue-500 text-white"
                    : "bg-white hover:bg-gray-100 text-gray-800"
                }`
          }`}
        title="Move to My Location"
        aria-label="Move to my location"
      >
        <Image
          src={
            activeUserButton
              ? "/images/map/device-car-white.svg"
              : "/images/map/car-mobile-location.svg"
          }
          alt={"My Location"}
          width={20}
          height={20}
          className="object-contain"
        />
      </button>
    </div>
  );
};

export default MapControls;
