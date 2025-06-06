"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import Image from "next/image";
import { 
  MAPBOX_LIGHT, 
  MAPBOX_DARK, 
  MAPBOX_SATELLITE, 
  MAPBOX_HYBRID 
} from "@/services/MapService";
import { createPhoneLocationMarker } from "./DeviceMarker";

// Event name constants to avoid typos
const EVENT_TRACKING_MODE_CHANGED = "trackingModeChanged";
const EVENT_MAP_STYLE_CHANGED = "mapStyleChanged";

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
      id: "satellite",
      type: MAPBOX_SATELLITE,
      label: "Satellite",
      img: "/images/map/satellite.svg",
    },
    {
      id: "hybrid",
      type: MAPBOX_HYBRID,
      label: "Hybrid",
      img: "/images/map/hybrid.svg",
    },
  ];

  // Helper function to wait for map to be ready
  const whenMapReady = (operation: () => void) => {
    if (!map) return;

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

  // Helper function to dispatch tracking mode change events
  const dispatchTrackingModeChange = (mode: string) => {
    const event = new CustomEvent(EVENT_TRACKING_MODE_CHANGED, {
      detail: { mode }
    });
    window.dispatchEvent(event);
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

    // Store marker positions before style change
    const existingMarkers = [...markersRef.current];
    const markerPositions = existingMarkers.map((marker) => marker.getLngLat());

    whenMapReady(() => {
      try {
        map.setStyle(styleUrl);
        map.once("style.load", () => {
          // Restore markers if they existed
          if (markerPositions.length > 0) {
            markerPositions.forEach((pos) => {
              if (map) createPhoneLocationMarker(map, pos.lng, pos.lat);
            });
          }

          // Emit style change event
          const event = new CustomEvent(EVENT_MAP_STYLE_CHANGED, {
            detail: { mapStyle: styleUrl }
          });
          window.dispatchEvent(event);
        });
      } catch (error) {
        console.error("Failed to change map style:", error);
        toast.error("Failed to change map style");
      }
    });
  };

  const handleDeviceLocationClick = () => {
    if (!deviceLocation) {
      toast.error("Device location unavailable");
      return;
    }

    // If mobile tracking is active, disable it first
    if (locationMode === "mobile") {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    // Toggle between device tracking and no tracking
    const newMode = locationMode === "device" ? "none" : "device";
    setLocationMode(newMode);

    if (newMode === "device" && map) {
      whenMapReady(() => {
        try {
          // Fly to the device location
          map.flyTo({
            center: [deviceLocation.lng, deviceLocation.lat],
            zoom: 16,
            duration: 500,
          });

          // Dispatch tracking mode change event
          dispatchTrackingModeChange("device");
        } catch (error) {
          console.error("Failed to fly to device location:", error);
          toast.error("Failed to navigate to device location");
        }
      });
    } else if (newMode === "none") {
      // Remove all mobile markers when deactivating tracking
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Dispatch event for mode change
      dispatchTrackingModeChange("none");
    }
  };

  const handleUserLocationClick = () => {
    // Toggle between mobile tracking and no tracking
    const newMode = locationMode === "mobile" ? "none" : "mobile";
    setLocationMode(newMode);

    if (newMode !== "mobile") {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Dispatch event for mode change
      dispatchTrackingModeChange("none");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      setLocationMode("none");
      return;
    }

    if (!map) {
      toast.info("Map is loading. Please try again in a moment.");
      setLocationMode("none");
      return;
    }

    // Clear previous watch if exists
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Start watching user's position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Create a marker for the user's location
        const marker = createPhoneLocationMarker(map, longitude, latitude);
        if (marker) markersRef.current.push(marker);

        // Create bounds that include both device and user locations
        const bounds = new mapboxgl.LngLatBounds();
        if (deviceLocation?.lng && deviceLocation?.lat) {
          bounds.extend([deviceLocation.lng, deviceLocation.lat]);
        }
        bounds.extend([longitude, latitude]);

        try {
          map?.fitBounds(bounds, {
            padding: 100,
            maxZoom: 12,
            duration: 500,
          });

          // Dispatch event for mobile tracking mode
          dispatchTrackingModeChange("mobile");
        } catch (error) {
          console.error("Failed to adjust map view:", error);
        }
      },
      (error) => {
        toast.error(`Location error: ${error.message}`);
        watchIdRef.current = null;
        setLocationMode("none");

        // Dispatch event for mode change
        dispatchTrackingModeChange("none");
      },
      { enableHighAccuracy: true }
    );
  };

  // Update theme-based map style
  useEffect(() => {
    if (!map) return;

    const themeStyleUrl = currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT;

    if (mapStyle === "custom-default") {
      whenMapReady(() => {
        try {
          map.setStyle(themeStyleUrl);
          map.once("style.load", () => {
            const event = new CustomEvent(EVENT_MAP_STYLE_CHANGED);
            window.dispatchEvent(event);
          });
        } catch (error) {
          console.error("Failed to update map style with theme:", error);
        }
      });
    }
  }, [currentTheme, map, mapStyle]);

  // Handle clicks outside dropdown
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
    <div className="flex flex-col gap-4 z-10">
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
