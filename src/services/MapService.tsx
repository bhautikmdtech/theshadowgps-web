"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export const MAPBOX_LIGHT =
  "mapbox://styles/abhishekbhatia02/cm7ektl0a006601r3ednqdyxu";
export const MAPBOX_DARK =
  "mapbox://styles/abhishekbhatia02/cm7el93sj00i901s7gawghy7j";

interface MapComponentProps {
  initialPosition: { lng: number; lat: number };
  onMapLoad?: (map: mapboxgl.Map) => void;
  mapRef?: React.RefObject<mapboxgl.Map | null>;
}

export default function MapComponent({
  initialPosition,
  onMapLoad,
  mapRef,
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
      zoom: 14,
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
    }
  }, [currentTheme, effectiveMapRef, styleLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0" />
    </div>
  );
}
