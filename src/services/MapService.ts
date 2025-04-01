"use client";

import mapboxgl from "mapbox-gl";
import type { Position } from "@/types/location";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYWJoaXNoZWtiaGF0aWEwMiIsImEiOiJjbTZpZXlwd2kwOGhtMmpxMmo4cXQ1YzBvIn0.6VmLnWwyzFJ8PvgY6-3jXA";

mapboxgl.accessToken = MAPBOX_TOKEN;

let mapInstance: mapboxgl.Map | null = null;
let markers: mapboxgl.Marker[] = [];
let clickHandlerAdded = false;
let liveModeEnabled = false;
let isHandlingLiveUpdate = false;

const addStyles = (): void => {
  if (!document.getElementById("marker-animations")) {
    const style = document.createElement("style");
    style.id = "marker-animations";
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        70% { transform: scale(1.5); opacity: 0.3; }
        100% { transform: scale(1.8); opacity: 0; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      .device-marker {
        position: relative;
        z-index: 5;
        transform-origin: center !important;
      }
      .mapboxgl-marker {
        will-change: transform;
        cursor: pointer;
      }
      .pulse-ring {
        animation: pulse 2s ease-in-out infinite;
      } 
      /* Custom popup styling */
      .mapboxgl-popup {
        z-index: 10;
      }
      .mapboxgl-popup-content {
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 3px 14px rgba(0,0,0,0.15);
      }
      
      /* Improved popup styling */
      .custom-popup .mapboxgl-popup-content {
        padding: 0;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        border-radius: 8px;
        min-width: 220px;
      }
      
      .custom-popup .mapboxgl-popup-close-button {
        font-size: 18px;
        color: #666;
        right: 8px;
        top: 8px;
      }
      
      .mapboxgl-popup-anchor-top .mapboxgl-popup-tip,
      .mapboxgl-popup-anchor-top-left .mapboxgl-popup-tip,
      .mapboxgl-popup-anchor-top-right .mapboxgl-popup-tip {
        border-bottom-color: white;
      }
      
      .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip,
      .mapboxgl-popup-anchor-bottom-left .mapboxgl-popup-tip,
      .mapboxgl-popup-anchor-bottom-right .mapboxgl-popup-tip {
        border-top-color: white;
      }
      
      /* Custom control button styling */
      .mapboxgl-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 29px;
        height: 29px;
        cursor: pointer;
        background-color: #fff;
        border: none;
        border-radius: 4px;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
        outline: none;
        padding: 0;
        margin: 0;
      }
      
      .mapboxgl-button:hover {
        background-color: #f8f8f8;
      }
      
      .mapboxgl-button svg {
        color: #333;
        transition: color 0.2s ease;
      }
      
      .mapboxgl-button:hover svg {
        color: #0078ff;
      }
      
      /* Add spacing between controls */
      .mapboxgl-ctrl-top-right .mapboxgl-ctrl {
        margin: 10px 10px 0 0;
      }
    `;
    document.head.appendChild(style);
  }
};

const addMapListeners = (): void => {
  if (!mapInstance) return;

  mapInstance.on("load", () => {
    console.log("Map loaded successfully");

    if (mapInstance) {
      mapInstance.scrollZoom.enable();
    }
  });

  mapInstance.on("error", (e) => {
    console.error("Mapbox error:", e.error);
  });

  mapInstance.on("zoomend", () => {
    if (markers.length > 0) {
      markers.forEach((marker) => {
        const currentLngLat = marker.getLngLat();
        marker.setLngLat([currentLngLat.lng, currentLngLat.lat]);
      });
    }
  });
};

const addCustomControl = ({
  title,
  className,
  icon,
  position,
  onClick,
}: {
  title: string;
  className: string;
  icon: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  onClick: () => void;
}): void => {
  if (!mapInstance) return;

  class CustomControl implements mapboxgl.IControl {
    private container: HTMLDivElement;
    private map?: mapboxgl.Map;

    constructor(
      private title: string,
      private className: string,
      private icon: string,
      private clickHandler: () => void
    ) {
      this.container = document.createElement("div");
    }

    onAdd(map: mapboxgl.Map) {
      this.map = map;
      this.container.className = "mapboxgl-ctrl";
      this.container.innerHTML = `
        <button class="${this.className}" type="button" title="${this.title}" aria-label="${this.title}">
          ${this.icon}
        </button>
      `;

      // Add click handler
      const button = this.container.querySelector("button");
      if (button) {
        button.addEventListener("click", () => {
          this.clickHandler();
        });
      }

      return this.container;
    }

    onRemove() {
      this.container.parentNode?.removeChild(this.container);
      this.map = undefined;
    }
  }

  mapInstance.addControl(
    new CustomControl(title, className, icon, onClick),
    position
  );
};

const addCustomControls = (): void => {
  if (!mapInstance) return;

  addCustomControl({
    title: "Show current location",
    className: "mapboxgl-button",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`,
    position: "bottom-right",
    onClick: () => {
      if (markers.length > 0) {
        const currentMarker = markers[markers.length - 1];
        if (currentMarker) {
          const lngLat = currentMarker.getLngLat();
          mapInstance?.flyTo({
            center: [lngLat.lng, lngLat.lat],
            zoom: 15,
            duration: 1000,
          });

          if (currentMarker.getPopup()) {
            setTimeout(() => {
              markers.forEach((m) => {
                if (m !== currentMarker && m.getPopup()?.isOpen()) {
                  m.getPopup()?.remove();
                }
              });
              currentMarker.togglePopup();
            }, 1000);
          }
        }
      }
    },
  });

  addCustomControl({
    title: "Show entire trip",
    className: "mapboxgl-button",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`,
    position: "bottom-right",
    onClick: () => {
      if (markers.length > 0) {
        const positions: Position[] = markers.map((marker) => {
          const lngLat = marker.getLngLat();
          return {
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          } as Position;
        });

        mapService.fitMapToPositions(positions);

        markers.forEach((marker) => {
          if (marker.getPopup()?.isOpen()) {
            marker.getPopup()?.remove();
          }
        });
      }
    },
  });
};

const addControls = (): void => {
  if (!mapInstance) return;

  mapInstance.addControl(
    new mapboxgl.AttributionControl({
      compact: true,
    }),
    "bottom-left"
  );

  // Add navigation and other controls
  mapInstance.addControl(new mapboxgl.NavigationControl(), "bottom-right");
  mapInstance.addControl(new mapboxgl.FullscreenControl(), "bottom-right");
  mapInstance.addControl(new mapboxgl.ScaleControl(), "bottom-left");

  addCustomControls();
};

const addInitials = (
  el: HTMLElement,
  name: string,
  fontSize: string = "20px"
): void => {
  const initial = name ? name.charAt(0).toUpperCase() : "D";
  const text = document.createElement("span");
  text.textContent = initial;
  text.style.color = "white";
  text.style.fontSize = fontSize;
  text.style.fontWeight = "bold";
  text.style.lineHeight = "1";
  text.style.fontFamily = "Arial, sans-serif";
  text.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)";
  el.appendChild(text);
};

const createStartMarkerElement = (
  deviceName: string,
  deviceImage: string
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "device-start-marker-container";
  container.style.cursor = "pointer";

  const el = document.createElement("div");
  el.style.width = "34px";
  el.style.height = "34px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#4267B2";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  el.style.display = "flex";
  el.style.justifyContent = "center";
  el.style.alignItems = "center";
  el.style.transition =
    "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out";

  container.onmouseenter = () => {
    el.style.transform = "scale(1.1)";
    el.style.boxShadow = "0 3px 10px rgba(0,0,0,0.4)";
  };

  container.onmouseleave = () => {
    el.style.transform = "scale(1)";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  };

  container.appendChild(el);

  if (deviceImage) {
    const img = document.createElement("img");
    img.src = deviceImage;
    img.style.width = "85%";
    img.style.height = "85%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "50%";
    img.style.opacity = "0.85";
    img.onerror = () => {
      img.remove();
      addInitials(el, deviceName, "16px");
    };
    el.appendChild(img);
  } else {
    addInitials(el, deviceName, "16px");
  }

  return container;
};

const createLastMarkerElement = (
  deviceName: string,
  deviceImage: string
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "device-end-marker-container";
  container.style.cursor = "pointer";
  container.style.padding = "8px";
  container.style.margin = "-8px";

  const el = document.createElement("div");
  el.className = "device-marker";
  el.style.width = "36px";
  el.style.height = "36px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#FF5722";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.4)";
  el.style.display = "flex";
  el.style.justifyContent = "center";
  el.style.alignItems = "center";
  el.style.position = "relative";
  el.style.transition =
    "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out";

  container.onmouseenter = () => {
    el.style.transform = "scale(1.1)";
    el.style.boxShadow = "0 3px 12px rgba(0,0,0,0.5)";
  };

  container.onmouseleave = () => {
    el.style.transform = "scale(1)";
    el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.4)";
  };

  container.appendChild(el);

  const pulseRing = document.createElement("div");
  pulseRing.className = "pulse-ring";
  pulseRing.style.position = "absolute";
  pulseRing.style.top = "-8px";
  pulseRing.style.left = "-8px";
  pulseRing.style.right = "-8px";
  pulseRing.style.bottom = "-8px";
  pulseRing.style.borderRadius = "50%";
  pulseRing.style.backgroundColor = "rgba(0, 200, 83, 0.3)";
  pulseRing.style.zIndex = "-1";
  el.appendChild(pulseRing);

  const liveDot = document.createElement("div");
  liveDot.style.position = "absolute";
  liveDot.style.top = "-5px";
  liveDot.style.right = "0";
  liveDot.style.width = "12px";
  liveDot.style.height = "12px";
  liveDot.style.borderRadius = "50%";
  liveDot.style.backgroundColor = "#23C16B";
  liveDot.style.border = "2px solid white";
  liveDot.style.zIndex = "3";
  el.appendChild(liveDot);

  if (deviceImage) {
    const img = document.createElement("img");
    img.src = deviceImage;
    img.style.width = "85%";
    img.style.height = "85%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "50%";
    img.onerror = () => {
      img.remove();
      addInitials(el, deviceName);
    };
    el.appendChild(img);
  } else {
    addInitials(el, deviceName);
  }

  return container;
};

const createStartPopup = (
  position: Position,
  deviceName: string,
  deviceImage: string
): mapboxgl.Popup => {
  return new mapboxgl.Popup({
    offset: [0, -10],
    closeButton: true,
    closeOnClick: false,
    className: "custom-popup",
    maxWidth: "300px",
  }).setHTML(
    `<div style="padding: 10px;">
       <div style="display:flex;align-items:center;margin-bottom:8px;">
         ${
           deviceImage
             ? `<img src="${deviceImage}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;object-fit:cover;opacity:0.9;" 
             onerror="this.style.display='none'">`
             : `<div style="width:24px;height:24px;border-radius:50%;background-color:#4267B2;color:white;display:flex;justify-content:center;align-items:center;margin-right:8px;font-weight:bold;font-size:12px;">${
                 deviceName ? deviceName.charAt(0).toUpperCase() : "D"
               }</div>`
         }
         <p style="margin:0;font-weight:bold;color:#333;font-size:14px;">Starting Point</p>
       </div>
       <p style="margin:4px 0 0;font-size:12px;color:#666;">${
         position.address || "Unknown location"
       }</p>
       ${
         position.timestamp
           ? `<p style="margin:4px 0 0;font-size:11px;color:#888;">${new Date(
               position.timestamp * 1000
             ).toLocaleString()}</p>`
           : ""
       }
     </div>`
  );
};

const createEventMarkerElement = (): HTMLElement => {
  const el = document.createElement("div");
  el.className = "event-marker";
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "rgba(56, 135, 190, 0.8)";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 1px 5px rgba(0,0,0,0.3)";
  return el;
};

const processPositions = (
  positions: Position[],
  deviceName: string,
  deviceImage: string
): void => {
  if (!mapInstance || !positions.length) return;

  try {
    // Filter valid positions
    const validPositions = positions.filter((pos) =>
      mapService.isValidPosition(pos)
    );

    if (validPositions.length === 0) {
      console.warn("No valid positions to process");
      return;
    }

    // Set up click handler if not done yet
    mapService.setupClickHandler();

    // Check if we already have markers
    if (markers.length > 0) {
      // Update existing markers with smooth animation
      updateMarkerPositions(validPositions);

      // Fit to all positions
      setTimeout(() => {
        mapService.fitMapToPositions(validPositions);
      }, 500);
    } else {
      // First time - clear any existing markers
      mapService.clearMarkers();

      // Add markers
      addAllMarkers(validPositions, deviceName, deviceImage);

      // Add route line
      mapService.addRouteLine(validPositions);

      // Always fit map to show all points on initial load
      setTimeout(() => {
        mapService.fitMapToPositions(validPositions);
      }, 500);
    }

    console.log(`Processed ${validPositions.length} positions`);
  } catch (error) {
    console.error("Error processing positions:", error);
  }
};

const updateMarkerPositions = (positions: Position[]): void => {
  if (!mapInstance || !positions.length || markers.length === 0) return;

  // Only update if we have both positions and existing markers
  const hasStartMarker = markers.length > 0;
  const hasCurrentMarker = markers.length > 1;

  // Get the start and current position
  const firstPosition = positions[0];
  const lastPosition = positions[positions.length - 1];

  // Update start marker position if we have it
  if (hasStartMarker && mapService.isValidPosition(firstPosition)) {
    const startMarker = markers[0];
    mapService.moveMarker(startMarker, [
      firstPosition.longitude,
      firstPosition.latitude,
    ]);

    // Update popup content
    const popup = startMarker.getPopup();
    if (popup) {
      // Store element data for identification
      if (!startMarker.getElement().hasAttribute("data-name")) {
        startMarker.getElement().setAttribute("data-name", "");
        startMarker.getElement().setAttribute("data-image", "");
      }

      // Create a new popup with updated content and settings
      const newPopup = createStartPopup(
        firstPosition,
        startMarker.getElement().getAttribute("data-name") || "",
        startMarker.getElement().getAttribute("data-image") || ""
      );

      // Apply new popup to marker
      startMarker.setPopup(newPopup);
    }
  }

  // Update current marker position if we have it
  if (hasCurrentMarker && mapService.isValidPosition(lastPosition)) {
    const currentMarker = markers[markers.length - 1];
    mapService.moveMarker(currentMarker, [
      lastPosition.longitude,
      lastPosition.latitude,
    ]);

    // Update popup content
    const popup = currentMarker.getPopup();
    if (popup) {
      // Store element data for identification
      if (!currentMarker.getElement().hasAttribute("data-name")) {
        currentMarker.getElement().setAttribute("data-name", "");
        currentMarker.getElement().setAttribute("data-image", "");
      }

      // Create a new popup with updated content and settings
      const newPopup = mapService.createCurrentPopup(
        lastPosition,
        currentMarker.getElement().getAttribute("data-name") || "",
        currentMarker.getElement().getAttribute("data-image") || ""
      );

      // Apply new popup to marker
      currentMarker.setPopup(newPopup);
    }
  }

  // Update route line if available
  if (mapInstance.getSource("route-arrow")) {
    mapService.addRouteLine(positions);
  }
};

const addAllMarkers = (
  positions: Position[],
  deviceName: string,
  deviceImage: string
): void => {
  if (!mapInstance || positions.length === 0) return;

  console.log(`Adding ${positions.length} markers with valid coordinates`);

  // Keep track of route markers separately
  const routeMarkers: mapboxgl.Marker[] = [];

  // Process positions
  positions.forEach((pos, index) => {
    // Determine marker type
    const isFirst = index === 0;
    const isLast = index === positions.length - 1;

    // Create appropriate marker
    if (isFirst) {
      mapService.createStartMarker(pos, deviceName, deviceImage);
    } else if (isLast) {
      mapService.createCurrentMarker(pos, deviceName, deviceImage);
    } else if (
      positions.length <= 10 ||
      index % Math.ceil(positions.length / 10) === 0
    ) {
      // For route markers, track them separately
      const marker = mapService.createRouteMarker(pos);
      if (marker) {
        routeMarkers.push(marker);

        // Initially hide route markers if zoomed out
        if (mapInstance && mapInstance.getZoom() < 12) {
          marker.getElement().style.display = "none";
        }
      }
    }
  });

  // Add zoom change handler to show/hide route markers
  if (mapInstance && routeMarkers.length > 0) {
    mapInstance.on("zoom", () => {
      const currentZoom = mapInstance?.getZoom() || 0;

      // Show/hide route markers based on zoom level
      routeMarkers.forEach((marker) => {
        marker.getElement().style.display =
          currentZoom >= 12 ? "block" : "none";
      });
    });
  }
};

const createArrowImage = (): void => {
  if (!mapInstance) return;

  // Create a canvas to draw the arrow
  const canvas = document.createElement("canvas");
  const size = 34;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw a triangular arrow
    ctx.beginPath();
    ctx.moveTo(size * 0.1, size * 0.3); // Left top
    ctx.lineTo(size * 0.9, size * 0.5); // Right middle
    ctx.lineTo(size * 0.1, size * 0.7); // Left bottom
    ctx.closePath();

    // Fill with red
    ctx.fillStyle = "#FF0000";
    ctx.fill();

    // Add white stroke
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add the image to the map
    mapInstance.addImage("arrow", {
      width: size,
      height: size,
      data: new Uint8Array(ctx.getImageData(0, 0, size, size).data),
    });
  }
};

const addEndArrow = (coordinates: number[][]): void => {
  if (!mapInstance || coordinates.length < 2) return;

  // Get the last two points to determine direction
  const lastPoint = coordinates[coordinates.length - 1];
  const secondLastPoint = coordinates[coordinates.length - 2];

  // Calculate bearing
  const bearing = mapService.getBearing(
    secondLastPoint[1],
    secondLastPoint[0],
    lastPoint[1],
    lastPoint[0]
  );

  // Add end arrow source if it doesn't exist
  if (!mapInstance.getSource("end-arrow")) {
    mapInstance.addSource("end-arrow", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: { bearing },
        geometry: {
          type: "Point",
          coordinates: lastPoint,
        },
      },
    });

    // Add end arrow layer
    mapInstance.addLayer({
      id: "end-arrow-layer",
      type: "symbol",
      source: "end-arrow",
      layout: {
        "icon-image": "arrow",
        "icon-size": 0.8,
        "icon-rotate": ["get", "bearing"],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  } else {
    // Update existing source
    const source = mapInstance.getSource("end-arrow") as mapboxgl.GeoJSONSource;
    source.setData({
      type: "Feature",
      properties: { bearing },
      geometry: {
        type: "Point",
        coordinates: lastPoint,
      },
    });
  }
};

// Create a simple location icon marker for live tracking with 30% larger size
const createLocationIconMarker = (
  position: Position
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "location-marker";
  container.style.position = "relative";
  container.style.cursor = "pointer";
  container.style.padding = "10px"; // Increased padding
  container.style.margin = "-10px"; // Adjusted margin

  // Create the marker circle with 30% larger size
  const markerCircle = document.createElement("div");
  markerCircle.style.width = "26px"; // Increased from 20px (30% larger)
  markerCircle.style.height = "26px"; // Increased from 20px (30% larger)
  markerCircle.style.backgroundColor = "#4285F4";
  markerCircle.style.border = "4px solid white"; // Increased border
  markerCircle.style.borderRadius = "50%";
  markerCircle.style.boxShadow = "0 3px 8px rgba(0,0,0,0.4)"; // Enhanced shadow
  container.appendChild(markerCircle);

  // Add pulse effect with larger size
  const pulseRing = document.createElement("div");
  pulseRing.className = "pulse-ring";
  pulseRing.style.position = "absolute";
  pulseRing.style.top = "-2px";
  pulseRing.style.left = "-2px";
  pulseRing.style.right = "-2px";
  pulseRing.style.bottom = "-2px";
  pulseRing.style.borderRadius = "50%";
  pulseRing.style.backgroundColor = "rgba(66, 133, 244, 0.4)"; // More visible pulse
  pulseRing.style.zIndex = "-1";
  container.appendChild(pulseRing);

  // Add hover effect
  container.onmouseenter = () => {
    markerCircle.style.transform = "scale(1.2)";
    markerCircle.style.transition = "transform 0.2s ease-in-out";
  };

  container.onmouseleave = () => {
    markerCircle.style.transform = "scale(1)";
  };

  return container;
};

// Add a new function to handle live position updates with smooth animation
const handleLivePositionUpdate = (
  prevPosition: Position,
  newPosition: Position,
  deviceName: string,
  deviceImage: string,
  isLiveModeEnabled: boolean = false
): void => {
  if (!mapInstance || !mapService.isValidPosition(prevPosition) || !mapService.isValidPosition(newPosition)) return;

  isHandlingLiveUpdate = true;

  try {
    // Calculate bearing for direction reference 
    const bearing = mapService.getBearing(
      prevPosition.latitude,
      prevPosition.longitude,
      newPosition.latitude,
      newPosition.longitude
    );
    
    // Get the last marker (current location marker)
    const currentMarker = markers.length > 1 ? markers[markers.length - 1] : null;
    
    if (!currentMarker) {
      isHandlingLiveUpdate = false;
      return;
    }
    
    // If in live mode, hide all intermediate markers and use a simple location icon
    if (isLiveModeEnabled || liveModeEnabled) {
      // Hide all markers except the first one (start) and the last one (current)
      for (let i = 1; i < markers.length - 1; i++) {
        markers[i].getElement().style.display = 'none';
      }

      // Make sure the first marker (start position) remains visible
      if (markers.length > 0) {
        markers[0].getElement().style.display = 'block';
      }
      
      // Get or create marker element for the current position
      const markerElement = currentMarker.getElement();
      const markerType = markerElement.getAttribute("data-marker-type");
      
      // If not already a location marker, replace it with one
      if (markerType !== "location") {
        // Create new location marker element
        const newMarkerElement = createLocationIconMarker(newPosition);
        
        // Store metadata
        newMarkerElement.setAttribute("data-marker-type", "location");
        newMarkerElement.setAttribute("data-name", deviceName || "");
        newMarkerElement.setAttribute("data-image", deviceImage || "");
        
        // Replace existing marker element
        currentMarker.getElement().replaceWith(newMarkerElement);
        
        // Recreate popup with new position info
        const newPopup = mapService.createCurrentPopup(
          newPosition,
          deviceName,
          deviceImage
        );
        currentMarker.setPopup(newPopup);
        
        // Reassign click handler
        newMarkerElement.onclick = (e: MouseEvent) => {
          e.stopPropagation(); // Prevent map click from triggering
          
          // Close other popups first
          markers.forEach((m) => {
            if (m !== currentMarker && m.getPopup()?.isOpen()) {
              m.getPopup()?.remove();
            }
          });
          
          // Toggle this popup
          if (currentMarker.getPopup()?.isOpen()) {
            currentMarker.getPopup()?.remove();
          } else {
            currentMarker.togglePopup();
          }
        };
      }
    } else {
      // If not in live mode, show all markers
      markers.forEach(marker => {
        marker.getElement().style.display = 'block';
      });
    }

    // Calculate zoom level based on speed and distance moved - increased for closer view
    let targetZoom = 18; // Increased default zoom level (was 16)
    if (newPosition.speed) {
      // Adjust zoom level based on speed (slower = more zoom)
      if (newPosition.speed > 80) targetZoom = 16;
      else if (newPosition.speed > 50) targetZoom = 17;
      else if (newPosition.speed > 30) targetZoom = 18;
      else targetZoom = 19; // Very close zoom for slow movement
    }

    // First start marker animation
    mapService.moveMarker(
      currentMarker, 
      [newPosition.longitude, newPosition.latitude],
      1200
    );

    // Then animate the map view (center, zoom, and rotation) if live mode is enabled
    if (isLiveModeEnabled || liveModeEnabled) {
      // Calculate distance moved to adjust zoom appropriately
      const distanceMoved = mapService.calculateDistance(
        prevPosition.latitude, 
        prevPosition.longitude,
        newPosition.latitude, 
        newPosition.longitude
      );
      
      // Fine-tune zoom based on distance moved - higher zoom levels overall
      if (distanceMoved < 5) { // Very small movements
        targetZoom = Math.min(targetZoom + 1, 19.5); // Zoom in more, capped higher
      } else if (distanceMoved > 100) { // Larger movements
        targetZoom = Math.max(targetZoom - 1, 16); // Zoom out a bit, but not below 16
      }
      
      // Center and rotate the map to follow the movement direction
      mapInstance.flyTo({
        center: [newPosition.longitude, newPosition.latitude],
        zoom: targetZoom,
        bearing: bearing, // Rotate map to match movement direction
        pitch: 55, // Slightly increased pitch for better visualization
        duration: 1000,
        essential: true,
        easing: (t: number) => {
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        },
        animate: true,
      });
    }

    // Update the popup content with new information
    if (currentMarker.getPopup()) {
      const newPopup = mapService.createCurrentPopup(
        newPosition,
        deviceName,
        deviceImage
      );
      currentMarker.setPopup(newPopup);
    }

    // Add a small delay to update the route line
    setTimeout(() => {
      // Store all valid positions to update the route
      const validPositions = markers.map(marker => {
        const lngLat = marker.getLngLat();
        return {
          latitude: lngLat.lat,
          longitude: lngLat.lng
        } as Position;
      });
      
      // Add the new position
      validPositions.push(newPosition);
      
      // Update route line
      mapService.addRouteLine(validPositions);
      
      isHandlingLiveUpdate = false;
    }, 300);
  } catch (error) {
    console.error("Error handling live position update:", error);
    isHandlingLiveUpdate = false;
  }
};

const mapService = {
  initializeMap: (container: HTMLElement): mapboxgl.Map => {
    addStyles();

    mapInstance = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [0, 0],
      zoom: 2,
      minZoom: 1,
      attributionControl: false,
      renderWorldCopies: true,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: true,
      scrollZoom: false,
    });

    container.setAttribute("data-testid", "map-container");

    // Add controls
    addControls();

    // Add listeners
    addMapListeners();

    return mapInstance;
  },
  removeMap: (): void => {
    if (mapInstance) {
      mapService.clearMarkers();
      mapInstance.remove();
      mapInstance = null;
      clickHandlerAdded = false;
    }
  },

  moveMarker: (
    marker: mapboxgl.Marker,
    newPosition: [number, number],
    duration: number = 1500
  ): void => {
    if (!marker) return;

    const oldLngLat = marker.getLngLat();
    const oldPosition: [number, number] = [oldLngLat.lng, oldLngLat.lat];
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeInOut = (t: number) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      };

      const easedProgress = easeInOut(progress);

      const lng =
        oldPosition[0] + (newPosition[0] - oldPosition[0]) * easedProgress;
      const lat =
        oldPosition[1] + (newPosition[1] - oldPosition[1]) * easedProgress;

      marker.setLngLat([lng, lat]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    // Start animation
    requestAnimationFrame(animate);
  },

  createCurrentPopup: (
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Popup => {
    return new mapboxgl.Popup({
      offset: [0, -10],
      closeButton: true,
      closeOnClick: false,
      maxWidth: "300px",
      className: "custom-popup",
    }).setHTML(
      `<div style="padding: 10px;">
       <div style="display:flex;align-items:center;margin-bottom:8px;">
         ${
           deviceImage
             ? `<img src="${deviceImage}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;object-fit:cover;" 
             onerror="this.style.display='none'">`
             : `<div style="width:24px;height:24px;border-radius:50%;background-color:#FF5722;color:white;display:flex;justify-content:center;align-items:center;margin-right:8px;font-weight:bold;">${
                 deviceName ? deviceName.charAt(0).toUpperCase() : "D"
               }</div>`
         }
         <div>
           <p style="margin:0;font-weight:bold;color:#333;font-size:14px;">${
             deviceName || "Current Location"
           }</p>
           <span style="display:flex;align-items:center;font-size:10px;color:#4CAF50;margin-top:2px;">
             <span style="display:inline-block;width:6px;height:6px;background-color:#4CAF50;border-radius:50%;margin-right:4px;"></span>
             Live Location
           </span>
         </div>
       </div>
       <p style="margin:0;font-size:12px;color:#444;border-bottom:1px solid #eee;padding-bottom:6px;">${
         position.address || "Unknown location"
       }</p>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;font-size:11px;color:#666;">
         ${
           position.timestamp
             ? `<div>Time: ${new Date(
                 position.timestamp * 1000
               ).toLocaleString()}</div>`
             : ""
         }
         ${
           position.speed
             ? `<div>Speed: ${Math.round(position.speed)} km/h</div>`
             : ""
         }
         <div>Lat: ${position.latitude.toFixed(6)}</div>
         <div>Lng: ${position.longitude.toFixed(6)}</div>
       </div>
     </div>`
    );
  },
  isValidPosition: (position: Position): boolean => {
    if (
      !position ||
      typeof position.latitude !== "number" ||
      typeof position.longitude !== "number"
    ) {
      return false;
    }

    if (
      !isFinite(position.latitude) ||
      !isFinite(position.longitude) ||
      (Math.abs(position.latitude) < 0.000001 &&
        Math.abs(position.longitude) < 0.000001)
    ) {
      return false;
    }

    if (
      Math.abs(position.latitude) > 90 ||
      Math.abs(position.longitude) > 180
    ) {
      return false;
    }

    return true;
  },
  getBearing: (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360; // Normalize to 0-360
  },
  calculateDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  },
  fitMapToPositions: (positions: Position[]): void => {
    if (!mapInstance || positions.length === 0) return;

    try {
      const bounds = new mapboxgl.LngLatBounds();
      let validPointsAdded = 0;

      // Extend bounds with valid positions
      positions.forEach((pos) => {
        if (mapService.isValidPosition(pos)) {
          bounds.extend([pos.longitude, pos.latitude]);
          validPointsAdded++;
        }
      });

      if (validPointsAdded === 0) {
        console.warn("No valid coordinates to fit bounds");
        return;
      }

      // Fit map to bounds with padding
      mapInstance.fitBounds(bounds, {
        padding: { top: 120, bottom: 120, left: 120, right: 120 },
        maxZoom: 15,
        duration: 1000,
      });
    } catch (error) {
      console.error("Error fitting bounds:", error);

      // Fallback to last position
      if (positions.length > 0) {
        mapService.centerMapOnPosition(positions[positions.length - 1]);
      }
    }
  },
  centerMapOnPosition: (position: Position, zoom: number = 14): void => {
    if (!mapInstance || !mapService.isValidPosition(position)) return;

    try {
      mapInstance.flyTo({
        center: [position.longitude, position.latitude],
        zoom,
        essential: true,
        duration: 1000,
      });

      // Show popup for the position
      setTimeout(() => {
        const marker = markers.find((m) => {
          const lngLat = m.getLngLat();
          return (
            lngLat.lat === position.latitude &&
            lngLat.lng === position.longitude
          );
        });

        if (marker && marker.getPopup()) {
          marker.togglePopup();
        }
      }, 1200);
    } catch (error) {
      console.error("Error centering on position:", error);
    }
  },
  setupClickHandler: (): void => {
    if (!mapInstance || clickHandlerAdded) return;

    // For closing popups when clicking outside markers
    mapInstance.on("click", (e) => {
      // Check if the click target is a marker or popup
      const element = e.originalEvent.target as HTMLElement;
      const isMarkerClick = element.closest(".mapboxgl-marker") !== null;
      const isPopupClick = element.closest(".mapboxgl-popup") !== null;

      // Only close popups if clicking outside markers and popups
      if (!isMarkerClick && !isPopupClick) {
        // Close all popups
        markers.forEach((marker) => {
          const popup = marker.getPopup();
          if (popup?.isOpen()) {
            popup.remove();
          }
        });
      }
    });

    clickHandlerAdded = true;
  },
  clearMarkers: (): void => {
    markers.forEach((marker) => marker.remove());
    markers = [];
  },
  createStartMarker: (
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Marker | null => {
    if (!mapInstance || !mapService.isValidPosition(position)) return null;

    const markerElement = createStartMarkerElement(deviceName, deviceImage);
    const popup = createStartPopup(position, deviceName, deviceImage);

    try {
      // Store device name and image as data attributes for later use
      markerElement.setAttribute("data-name", deviceName);
      markerElement.setAttribute("data-image", deviceImage || "");
      markerElement.setAttribute("data-marker-type", "start");

      // Create marker with correct settings
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "center", // Change from "center" to "bottom" to fix position
        draggable: false,
        pitchAlignment: "map", // Change from "viewport" to "map" for better stability
        rotationAlignment: "viewport",
      });

      // Set position precisely
      marker.setLngLat([position.longitude, position.latitude]);

      // Add popup but don't open by default
      marker.setPopup(popup);

      // Add clickable behavior to the marker element
      markerElement.onclick = (e: MouseEvent) => {
        e.stopPropagation(); // Prevent map click from triggering

        // Close other popups first
        markers.forEach((m) => {
          if (m !== marker && m.getPopup()?.isOpen()) {
            m.getPopup()?.remove();
          }
        });

        // Toggle this popup immediately
        if (marker.getPopup()?.isOpen()) {
          marker.getPopup()?.remove();
        } else {
          marker.togglePopup();
        }

        // Then center on this marker
        setTimeout(() => {
          if (mapInstance) {
            // Center on this marker after showing popup
            mapInstance.flyTo({
              center: [position.longitude, position.latitude],
              zoom: 15,
              duration: 1000,
            });
          }
        }, 200);
      };

      // Add to map
      marker.addTo(mapInstance);
      markers.push(marker);

      // Force marker to maintain its position on zoom events
      mapInstance.on("zoom", () => {
        // This helps ensure the marker stays exactly at its position
        marker.setLngLat([position.longitude, position.latitude]);
      });

      return marker;
    } catch (error) {
      console.error("Error creating start marker:", error);
      return null;
    }
  },
  createCurrentMarker: (
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Marker | null => {
    if (!mapInstance || !mapService.isValidPosition(position)) return null;

    const markerElement = createLastMarkerElement(deviceName, deviceImage);
    const popup = mapService.createCurrentPopup(
      position,
      deviceName,
      deviceImage
    );

    try {
      // Store device name and image as data attributes for later use
      markerElement.setAttribute("data-name", deviceName);
      markerElement.setAttribute("data-image", deviceImage || "");
      markerElement.setAttribute("data-marker-type", "current");

      // Create marker with correct settings
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "center", // Change from "center" to "bottom" for better positioning
        draggable: false,
        pitchAlignment: "map", // Use map alignment for better stability during zoom
        rotationAlignment: "viewport",
      });

      // Set position precisely
      marker.setLngLat([position.longitude, position.latitude]);

      // Add popup
      marker.setPopup(popup);

      // Add clickable behavior to the marker element
      markerElement.onclick = (e: MouseEvent) => {
        e.stopPropagation(); // Prevent map click from triggering

        // Close other popups first
        markers.forEach((m) => {
          if (m !== marker && m.getPopup()?.isOpen()) {
            m.getPopup()?.remove();
          }
        });

        // Toggle this popup immediately
        if (marker.getPopup()?.isOpen()) {
          marker.getPopup()?.remove();
        } else {
          marker.togglePopup();
        }

        // Then center on this marker
        setTimeout(() => {
          if (mapInstance) {
            // Center on this marker
            mapInstance.flyTo({
              center: [position.longitude, position.latitude],
              zoom: 15,
              duration: 1000,
            });
          }
        }, 200);
      };

      // Add to map
      marker.addTo(mapInstance);
      markers.push(marker);

      // Force marker to maintain its position on zoom events
      mapInstance.on("zoom", () => {
        // This helps ensure the marker stays exactly at its position
        marker.setLngLat([position.longitude, position.latitude]);
      });

      return marker;
    } catch (error) {
      console.error("Error creating current marker:", error);
      return null;
    }
  },
  createRouteMarker: (position: Position): mapboxgl.Marker | null => {
    if (!mapInstance || !mapService.isValidPosition(position)) return null;

    const markerElement = createEventMarkerElement();

    try {
      // Create marker with correct settings
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "center",
        draggable: false,
      });

      // Set position
      marker.setLngLat([position.longitude, position.latitude]);

      // Add to map
      marker.addTo(mapInstance);
      markers.push(marker);

      return marker;
    } catch (error) {
      console.error("Error creating route marker:", error);
      return null;
    }
  },
  handleFocusPoint: (
    index: number,
    type: string,
    positions: Position[]
  ): void => {
    if (!mapInstance || positions.length === 0) {
      console.warn("Map not initialized or no positions available");
      return;
    }

    if (index < 0 || index >= positions.length) {
      console.warn(
        `Invalid index: ${index}. Valid range: 0-${positions.length - 1}`
      );
      return;
    }

    const position = positions[index];

    const zoom = type === "current" ? 16 : 15;

    let marker = null;
    if (index < markers.length) {
      marker = markers[index];
    }

    // First close any open popups
    markers.forEach((m) => {
      if (m.getPopup()?.isOpen()) {
        m.getPopup()?.remove();
      }
    });

    // Center on position and ensure the marker is visible
    mapInstance.flyTo({
      center: [position.longitude, position.latitude],
      zoom: zoom,
      duration: 1000,
      essential: true,
    });

    if (marker && marker.getPopup()) {
      setTimeout(() => {
        if (!marker.getPopup()?.isOpen()) {
          marker.togglePopup();
        }
      }, 1000);
    }
  },
  updatePositions: (
    positions: Position[],
    deviceName: string,
    deviceImage: string
  ): void => {
    if (!mapInstance) return;

    // Process positions
    if (!mapInstance.loaded()) {
      console.log("Map not loaded yet, waiting...");
      mapInstance.once("load", () => {
        setTimeout(
          () => processPositions(positions, deviceName, deviceImage),
          100
        );
      });
    } else {
      setTimeout(
        () => processPositions(positions, deviceName, deviceImage),
        100
      );
    }
  },
  addRouteLine: (positions: Position[]): void => {
    if (!mapInstance || positions.length < 2) return;

    try {
      // Filter valid positions
      const validPositions = positions.filter((pos) =>
        mapService.isValidPosition(pos)
      );

      if (validPositions.length < 2) {
        console.warn("Not enough valid positions for route line");
        return;
      }

      const coordinates = validPositions.map((pos) => [
        pos.longitude,
        pos.latitude,
      ]);

      // Create a custom arrow image if it doesn't exist
      if (!mapInstance.hasImage("arrow")) {
        createArrowImage();
      }

      // Add arrow layer if it doesn't exist
      if (!mapInstance.getSource("route-arrow")) {
        // Add source for the arrow line
        mapInstance.addSource("route-arrow", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        });

        // Add a green line layer
        mapInstance.addLayer({
          id: "route-arrow-line",
          type: "line",
          source: "route-arrow",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#23C16B",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });

        // Add arrow symbols along the line
        mapInstance.addLayer({
          id: "route-arrow-symbol",
          type: "symbol",
          source: "route-arrow",
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": 120, // Space between arrows
            "icon-image": "arrow",
            "icon-size": 0.7,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-rotation-alignment": "map",
          },
        });
      } else {
        // Update existing source
        const source = mapInstance.getSource(
          "route-arrow"
        ) as mapboxgl.GeoJSONSource;
        source.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        });
      }

      // Add route background if it doesn't exist
      if (!mapInstance.getSource("route")) {
        mapInstance.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        });
      } else {
        // Update existing source
        const source = mapInstance.getSource("route") as mapboxgl.GeoJSONSource;
        source.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        });
      }

      // Add a larger arrow at the end
      addEndArrow(coordinates);
    } catch (error) {
      console.error("Error adding route line:", error);
    }
  },
  handleLiveUpdate: (
    prevPosition: Position,
    newPosition: Position,
    deviceName: string,
    deviceImage: string,
    isLiveModeEnabled: boolean = false
  ): void => {
    handleLivePositionUpdate(prevPosition, newPosition, deviceName, deviceImage, isLiveModeEnabled);
  },
  setLiveModeEnabled: (enabled: boolean): void => {
    liveModeEnabled = enabled;
    
    // If live mode is disabled, reset the map view and show all markers
    if (!enabled && mapInstance) {
      mapInstance.easeTo({
        pitch: 0,
        bearing: 0, // Reset to north
        duration: 1000
      });
      
      // Show all markers when disabling live mode
      markers.forEach(marker => {
        marker.getElement().style.display = 'block';
      });

      // Restore the last marker to device icon if it was changed to location icon
      if (markers.length > 1) {
        const lastMarker = markers[markers.length - 1];
        const markerType = lastMarker.getElement().getAttribute("data-marker-type");
        
        if (markerType === "location") {
          // Get the last position
          const lngLat = lastMarker.getLngLat();
          const position: Position = {
            latitude: lngLat.lat,
            longitude: lngLat.lng,
            timestamp: Math.floor(Date.now() / 1000), // Add current timestamp
            speed: 0, // Add default speed
            direction: 0, // Add default direction
            address: "Current location" // Add default address
          };
          
          // Get device info from marker attributes
          const deviceName = lastMarker.getElement().getAttribute("data-name") || "";
          const deviceImage = lastMarker.getElement().getAttribute("data-image") || "";
          
          // Create a new device marker element
          const newMarkerElement = createLastMarkerElement(deviceName, deviceImage);
          newMarkerElement.setAttribute("data-name", deviceName);
          newMarkerElement.setAttribute("data-image", deviceImage);
          newMarkerElement.setAttribute("data-marker-type", "current");
          
          // Replace the marker element
          lastMarker.getElement().replaceWith(newMarkerElement);
        }
      }
    } 
    // If enabling live mode, hide intermediate markers and keep only first and current
    else if (enabled && mapInstance && markers.length > 1) {
      // Make sure first marker is visible
      if (markers.length > 0) {
        markers[0].getElement().style.display = 'block';
      }
      
      // Make sure last marker is visible but change it to location icon
      if (markers.length > 1) {
        const lastMarker = markers[markers.length - 1];
        lastMarker.getElement().style.display = 'block';
        
        // Get the last position
        const lngLat = lastMarker.getLngLat();
        const position: Position = {
          latitude: lngLat.lat,
          longitude: lngLat.lng,
          timestamp: Math.floor(Date.now() / 1000), // Add current timestamp
          speed: 0, // Add default speed
          direction: 0, // Add default direction
          address: "Current location" // Add default address
        };
        
        // Get device info from marker attributes
        const deviceName = lastMarker.getElement().getAttribute("data-name") || "";
        const deviceImage = lastMarker.getElement().getAttribute("data-image") || "";
        
        // Create a location icon marker
        const newMarkerElement = createLocationIconMarker(position);
        newMarkerElement.setAttribute("data-name", deviceName);
        newMarkerElement.setAttribute("data-image", deviceImage);
        newMarkerElement.setAttribute("data-marker-type", "location");
        
        // Replace the marker element
        lastMarker.getElement().replaceWith(newMarkerElement);
      }
      
      // Hide all intermediate markers
      for (let i = 1; i < markers.length - 1; i++) {
        markers[i].getElement().style.display = 'none';
      }
      
      // Focus on current position immediately when enabling live mode
      if (markers.length > 1) {
        const lastMarker = markers[markers.length - 1];
        const lngLat = lastMarker.getLngLat();
        
        // Use a more immersive view for live mode
        mapInstance.flyTo({
          center: [lngLat.lng, lngLat.lat],
          zoom: 18, // Closer zoom level (was 16)
          pitch: 55, // Add pitch for better immersion (was 50)
          bearing: 0, // Start with north, will rotate with movement
          duration: 1000
        });
      }
    }
  }
};

export default mapService;
