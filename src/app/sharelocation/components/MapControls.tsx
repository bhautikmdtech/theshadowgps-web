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
  locationMode: string;
  setLocationMode: (mode: string) => void;
  watchIdRef: React.MutableRefObject<number | null>;
}

const MapControls = ({
  map,
  deviceLocation,
  locationMode,
  setLocationMode,
  watchIdRef,
}: MapControlsProps) => {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState(
    currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT
  );
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    try {
      if (!map.isStyleLoaded()) {
        map.once("style.load", operation);
        return;
      }

      operation();
    } catch (error) {
      console.error("Error in whenMapReady:", error);
    }
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

    // Store reference to any existing markers before changing style
    const existingMarkers = [...markersRef.current];
    const markerPositions = existingMarkers.map((marker) => marker.getLngLat());

    whenMapReady(() => {
      try {
        // Set the new style
        map.setStyle(styleUrl);

        // After style loads, restore route and markers
        map.once("style.load", () => {
          // First restore markers if they existed
          if (markerPositions.length > 0) {
            markerPositions.forEach((pos) => {
              updateDeviceMarker(pos.lng, pos.lat);
            });
          }

          // Then emit event to restore route
          setTimeout(() => {
            const event = new CustomEvent("mapStyleChanged", {
              detail: { mapStyle: styleUrl },
            });
            window.dispatchEvent(event);
          }, 50);
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

    // If user location is active, turn it off
    if (locationMode === "mobile") {
      // Clear user location tracking
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Clear markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    // Toggle device location active state
    const newMode = locationMode === "device" ? "none" : "device";
    setLocationMode(newMode);

    // If turning on device tracking and map exists, fly to device location
    if (newMode === "device" && map) {
      whenMapReady(() => {
        try {
          // Add the marker to the map
          updateDeviceMarker(deviceLocation.lng, deviceLocation.lat);

          // Fly to the device location
          map.flyTo({
            center: [deviceLocation.lng, deviceLocation.lat],
            zoom: 16,
            essential: true,
            duration: 500,
          });
        } catch (error) {
          console.error("Failed to fly to device location:", error);
          toast.error("Failed to navigate to device location");
        }
      });
    }
  };

  const handleUserLocationClick = () => {
    // Always turn off device tracking when user location is clicked
    const newMode = locationMode === "mobile" ? "none" : "mobile";
    setLocationMode(newMode);

    // If turning off user tracking, clean up
    if (newMode !== "mobile") {
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
      setLocationMode("none");
      return;
    }

    // Need map for user location tracking
    if (!map) {
      toast.info("Map is loading. Please try again in a moment.");
      setLocationMode("none");
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
            maxZoom: 12,
            duration: 500,
          });
        } catch (error) {
          console.error("Failed to adjust map view:", error);
        }
      },
      (error) => {
        toast.error(`Location error: ${error.message}`);
        watchIdRef.current = null;
        setLocationMode("none");
      },
      { enableHighAccuracy: true }
    );
  };

  // Check if map is ready and initialize markers if needed
  useEffect(() => {
    if (!map) return;

    // If device location tracking is active by default, trigger the location update
    if (locationMode === "device" && deviceLocation) {
      updateDeviceMarker(deviceLocation.lng, deviceLocation.lat);
    }
  }, [map, locationMode, deviceLocation]);

  // Update mapStyle when theme changes
  useEffect(() => {
    // Skip if map is not available
    if (!map) return;

    const themeStyleUrl = currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT;

    // Only update if we're using the default style and the theme changes
    if (mapStyle === "custom-default") {
      whenMapReady(() => {
        try {
          // Set the new style
          map.setStyle(themeStyleUrl);

          // After style loads, notify ShareLocationViewer to restore route
          map.once("style.load", () => {
            setTimeout(() => {
              const event = new CustomEvent("mapStyleChanged");
              window.dispatchEvent(event);
            }, 50);
          });
        } catch (error) {
          console.error("Failed to update map style with theme:", error);
        }
      });
    }
  }, [currentTheme, map, mapStyle]);

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
    <div className="flex flex-col gap-2 z-10">
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
                  locationMode === "device"
                    ? "bg-blue-500 text-white"
                    : "bg-black hover:bg-gray-800 text-white"
                }`
              : `${
                  locationMode === "device"
                    ? "bg-blue-500 text-white"
                    : "bg-white hover:bg-gray-100 text-gray-800"
                }`
          }`}
        title="Move to Device Location"
        aria-label="Move to device location"
      >
        <Image
          src={
            locationMode === "device"
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
                  locationMode === "mobile"
                    ? "bg-blue-500 text-white"
                    : "bg-black hover:bg-gray-800 text-white"
                }`
              : `${
                  locationMode === "mobile"
                    ? "bg-blue-500 text-white"
                    : "bg-white hover:bg-gray-100 text-gray-800"
                }`
          }`}
        title="Move to My Location"
        aria-label="Move to my location"
      >
        <Image
          src={
            locationMode === "mobile"
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
