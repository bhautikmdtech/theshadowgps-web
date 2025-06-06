"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export const MAPBOX_LIGHT =
  "mapbox://styles/abhishekbhatia02/cm7ektl0a006601r3ednqdyxu";
export const MAPBOX_DARK =
  "mapbox://styles/abhishekbhatia02/cm7el93sj00i901s7gawghy7j";

export const MAPBOX_SATELLITE = "mapbox://styles/mapbox/satellite-v9";
export const MAPBOX_HYBRID = "mapbox://styles/mapbox/satellite-streets-v11";

interface MapComponentProps {
  initialPosition: { lng: number; lat: number };
  onMapLoad?: (map: mapboxgl.Map) => void;
  mapRef?: React.RefObject<mapboxgl.Map | null>;
  zoom?: number;
}

export default function MapComponent({
  initialPosition,
  onMapLoad,
  mapRef,
  zoom = 14,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const internalMapRef = useRef<mapboxgl.Map | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  // Get the actual map reference to use
  const effectiveMapRef = mapRef || internalMapRef;

  useEffect(() => {
    if (!mapContainerRef.current || effectiveMapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT,
      center: [initialPosition.lng, initialPosition.lat],
      zoom: zoom,
      minZoom: 1,
      attributionControl: false,
      renderWorldCopies: true,
    });

    // Track when the style is loaded
    map.on("styledata", () => {
      setStyleLoaded(true);
    });

    // Handle initial style load and add other event listeners
    map.on("load", () => {
      effectiveMapRef.current = map;
      setStyleLoaded(true);
      onMapLoad?.(map);
    });

    return () => {
      map.remove();
      effectiveMapRef.current = null;
      setStyleLoaded(false);
    };
  }, []);

  // Handle theme changes
  useEffect(() => {
    if (effectiveMapRef?.current && styleLoaded) {
      const themeStyleUrl =
        currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT;

      effectiveMapRef.current.setStyle(themeStyleUrl);

      // Emit style change event
      const event = new CustomEvent("mapStyleChanged");
      window.dispatchEvent(event);
    }
  }, [currentTheme, effectiveMapRef, styleLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0" />
    </div>
  );
}
