"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapControls from "@/app/sharelocation/components/MapControls";
import { useTheme } from "next-themes";

mapboxgl.accessToken =
  "pk.eyJ1IjoiYWJoaXNoZWtiaGF0aWEwMiIsImEiOiJjbTZpZXlwd2kwOGhtMmpxMmo4cXQ1YzBvIn0.6VmLnWwyzFJ8PvgY6-3jXA";

export const MAPBOX_LIGHT =
  "mapbox://styles/abhishekbhatia02/cm7ektl0a006601r3ednqdyxu";
export const MAPBOX_DARK =
  "mapbox://styles/abhishekbhatia02/cm7el93sj00i901s7gawghy7j";

interface MapComponentProps {
  initialPosition: { lng: number; lat: number };
  onMapLoad?: (map: mapboxgl.Map) => void;
}

export default function MapComponent({
  initialPosition,
  onMapLoad,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT,
      center: [initialPosition.lng, initialPosition.lat],
      zoom: 14,
      minZoom: 1,
      attributionControl: false,
      renderWorldCopies: true,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: true,
      scrollZoom: true,
    });

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
      onMapLoad?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    if (mapRef.current && currentTheme) {
      const themeStyleUrl =
        currentTheme === "dark" ? MAPBOX_DARK : MAPBOX_LIGHT;

      mapRef.current.setStyle(themeStyleUrl);
    }
  }, [currentTheme]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className="absolute top-0 left-0 w-full h-full"
      />
      {mapReady && mapRef.current && (
        <div className="absolute bottom-4 right-4 z-10 bg-none">
          <MapControls map={mapRef.current} deviceLocation={initialPosition} />
        </div>
      )}
    </div>
  );
}
