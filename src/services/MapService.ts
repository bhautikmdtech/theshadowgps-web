"use client";

import mapboxgl from "mapbox-gl";
import type { Position } from "@/types/location";

// Mapbox access token
const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYWJoaXNoZWtiaGF0aWEwMiIsImEiOiJjbTZpZXlwd2kwOGhtMmpxMmo4cXQ1YzBvIn0.6VmLnWwyzFJ8PvgY6-3jXA";

// Set the access token for Mapbox
mapboxgl.accessToken = MAPBOX_TOKEN;

// State variables
let mapInstance: mapboxgl.Map | null = null;
let markers: mapboxgl.Marker[] = [];
let clickHandlerAdded = false;

// Additional styles for markers and animations
const addStyles = (): void => {
  // Add marker animations style if not already present
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
        transform-origin: center bottom !important;
      }
      .device-start-marker-container {
        position: relative;
        z-index: 3;
        transition: transform 0.2s ease-in-out;
        transform-origin: center bottom !important;
      }
      .device-start-marker-container:hover {
        transform: scale(1.1);
      }
      .mapboxgl-marker {
        will-change: transform;
        cursor: pointer;
      }
      .pulse-ring {
        animation: pulse 2s ease-in-out infinite;
      }
      .device-end-marker-container {
         top: 16px !important;
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

// Helper function to check if a position is valid
const isValidPosition = (position: Position): boolean => {
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
};

// Add event listeners to the map
const addMapListeners = (): void => {
  if (!mapInstance) return;

  // Log when map is loaded
  mapInstance.on("load", () => {
    console.log("Map loaded successfully");

    // Enable scroll zoom after the map is loaded
    if (mapInstance) {
      mapInstance.scrollZoom.enable();
    }
  });

  // Event listener for map errors
  mapInstance.on("error", (e) => {
    console.error("Mapbox error:", e.error);
  });
};

// Add a custom control button to the map
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

  // Create a custom control class
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

  // Add the control to the map
  mapInstance.addControl(
    new CustomControl(title, className, icon, onClick),
    position
  );
};

// Add custom controls to the map
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
      // Get all positions from markers
      if (markers.length > 0) {
        const positions: Position[] = markers.map((marker) => {
          const lngLat = marker.getLngLat();
          return {
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          } as Position;
        });

        // Fit map to show all positions
        fitMapToPositions(positions);

        // Close all popups
        markers.forEach((marker) => {
          if (marker.getPopup()?.isOpen()) {
            marker.getPopup()?.remove();
          }
        });
      }
    },
  });
};

// Add standard controls to the map
const addControls = (): void => {
  if (!mapInstance) return;

  // Add attribution control
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

// Initialize the Mapbox map
const initializeMap = (container: HTMLElement): mapboxgl.Map => {
  console.log("Initializing map");

  // Add styles for markers and popups
  addStyles();

  // Initialize map with a default center
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
    scrollZoom: false, // Disable scroll zoom initially for better UX
  });

  // Set data-testid for map container
  container.setAttribute("data-testid", "map-container");

  // Add controls
  addControls();

  // Add listeners
  addMapListeners();

  return mapInstance;
};

// Fit the map to show all positions
const fitMapToPositions = (positions: Position[]): void => {
  if (!mapInstance || positions.length === 0) return;

  try {
    const bounds = new mapboxgl.LngLatBounds();
    let validPointsAdded = 0;

    // Extend bounds with valid positions
    positions.forEach((pos) => {
      if (isValidPosition(pos)) {
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
      centerMapOnPosition(positions[positions.length - 1]);
    }
  }
};

// Center the map on a specific position
const centerMapOnPosition = (position: Position, zoom: number = 14): void => {
  if (!mapInstance || !isValidPosition(position)) return;

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
};

// Set up click handler to close popups when clicking outside
const setupClickHandler = (): void => {
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
};

// Clear all markers from the map
const clearMarkers = (): void => {
  markers.forEach((marker) => marker.remove());
  markers = [];
};

// Remove the map and clean up
const removeMap = (): void => {
  if (mapInstance) {
    clearMarkers();
    mapInstance.remove();
    mapInstance = null;
    clickHandlerAdded = false;
  }
};

// Add initials to a marker element
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

// Create marker element for the starting position
const createStartMarkerElement = (
  deviceName: string,
  deviceImage: string
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "device-start-marker-container";
  container.style.top = "16px";
  container.style.cursor = "pointer";

  // Create main marker
  const el = document.createElement("div");
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#4267B2"; // Different color for starting point
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  el.style.display = "flex";
  el.style.justifyContent = "center";
  el.style.alignItems = "center";

  // Add to container
  container.appendChild(el);

  // Add indicator dot
  const dot = document.createElement("div");
  dot.style.position = "absolute";
  dot.style.top = "-2px";
  dot.style.right = "5px";
  dot.style.width = "10px";
  dot.style.height = "10px";
  dot.style.borderRadius = "50%";
  dot.style.backgroundColor = "#4CAF50";
  dot.style.border = "2px solid white";
  dot.style.zIndex = "2";
  el.appendChild(dot);

  // Add device image or initials
  if (deviceImage) {
    const img = document.createElement("img");
    img.src = deviceImage;
    img.style.width = "85%";
    img.style.height = "85%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "50%";
    img.style.opacity = "0.85"; // Slightly faded for past position
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

// Create marker element for the current device position
const createDeviceMarkerElement = (
  deviceName: string,
  deviceImage: string
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "device-end-marker-container";
  container.style.top = "16px";
  container.style.cursor = "pointer";

  const el = document.createElement("div");
  el.className = "device-marker";
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = "#FF5722";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.4)";
  el.style.display = "flex";
  el.style.justifyContent = "center";
  el.style.alignItems = "center";
  el.style.position = "relative";

  // Add to container
  container.appendChild(el);

  // Add pulse ring
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

  // Add live indicator dot
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

  // Add device image or initials
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

// Create popup for start marker
const createStartPopup = (
  position: Position,
  deviceName: string,
  deviceImage: string
): mapboxgl.Popup => {
  return new mapboxgl.Popup({
    offset: [0, -15],
    closeButton: false,
    closeOnClick: false,
    className: "custom-popup",
    maxWidth: "280px",
  }).setHTML(
    `<div style="padding: 8px;">
       <div style="display:flex;align-items:center;margin-bottom:6px;">
         ${
           deviceImage
             ? `<img src="${deviceImage}" style="width:20px;height:20px;border-radius:50%;margin-right:6px;object-fit:cover;opacity:0.9;" 
             onerror="this.style.display='none'">`
             : `<div style="width:20px;height:20px;border-radius:50%;background-color:#4267B2;color:white;display:flex;justify-content:center;align-items:center;margin-right:6px;font-weight:bold;font-size:10px;">${
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

// Create popup for current marker
const createCurrentPopup = (
  position: Position,
  deviceName: string,
  deviceImage: string
): mapboxgl.Popup => {
  return new mapboxgl.Popup({
    offset: [0, -20],
    closeButton: false,
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
};

// Create a route point marker
const createRouteMarker = (position: Position): mapboxgl.Marker | null => {
  if (!mapInstance || !isValidPosition(position)) return null;

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
};

// Create event marker element
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

// Create a marker for the starting position
const createStartMarker = (
  position: Position,
  deviceName: string,
  deviceImage: string
): mapboxgl.Marker | null => {
  if (!mapInstance || !isValidPosition(position)) return null;

  const markerElement = createStartMarkerElement(deviceName, deviceImage);
  const popup = createStartPopup(position, deviceName, deviceImage);

  try {
    // Create marker with correct settings
    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: "bottom",
      draggable: false,
      pitchAlignment: "viewport",
      rotationAlignment: "viewport",
    });

    // Set position
    marker.setLngLat([position.longitude, position.latitude]);

    // Add popup
    marker.setPopup(popup);

    // Add clickable behavior to the marker element
    markerElement.onclick = (e: MouseEvent) => {
      e.stopPropagation(); // Prevent map click from triggering

      // First, show the entire trip
      if (markers.length > 0) {
        const positions: Position[] = markers.map((m) => {
          const lngLat = m.getLngLat();
          return {
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          } as Position;
        });
        fitMapToPositions(positions);
      }

      // Then toggle this marker's popup
      setTimeout(() => {
        // Close other popups first
        markers.forEach((m) => {
          if (m !== marker && m.getPopup()?.isOpen()) {
            m.getPopup()?.remove();
          }
        });

        // Toggle this popup
        if (marker.getPopup()?.isOpen()) {
          marker.getPopup()?.remove();
        } else {
          marker.togglePopup();
        }
      }, 1000);
    };

    // Add to map
    marker.addTo(mapInstance);
    markers.push(marker);

    return marker;
  } catch (error) {
    console.error("Error creating start marker:", error);
    return null;
  }
};

// Create a marker for the current position
const createCurrentMarker = (
  position: Position,
  deviceName: string,
  deviceImage: string
): mapboxgl.Marker | null => {
  if (!mapInstance || !isValidPosition(position)) return null;

  const markerElement = createDeviceMarkerElement(deviceName, deviceImage);
  const popup = createCurrentPopup(position, deviceName, deviceImage);

  try {
    // Create marker with correct settings
    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: "bottom",
      draggable: false,
      pitchAlignment: "viewport",
      rotationAlignment: "viewport",
    });

    // Set position
    marker.setLngLat([position.longitude, position.latitude]);

    // Add popup
    marker.setPopup(popup);

    // Add clickable behavior to the marker element
    markerElement.onclick = (e: MouseEvent) => {
      e.stopPropagation(); // Prevent map click from triggering

      // First, show the entire trip
      if (markers.length > 0) {
        const positions: Position[] = markers.map((m) => {
          const lngLat = m.getLngLat();
          return {
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          } as Position;
        });
        fitMapToPositions(positions);
      }

      // Then toggle this marker's popup
      setTimeout(() => {
        // Close other popups first
        markers.forEach((m) => {
          if (m !== marker && m.getPopup()?.isOpen()) {
            m.getPopup()?.remove();
          }
        });

        // Toggle this popup
        if (marker.getPopup()?.isOpen()) {
          marker.getPopup()?.remove();
        } else {
          marker.togglePopup();
        }
      }, 1000);
    };

    // Add to map
    marker.addTo(mapInstance);
    markers.push(marker);

    return marker;
  } catch (error) {
    console.error("Error creating current marker:", error);
    return null;
  }
};

// Move a marker to a new position with animation
const moveMarker = (
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

    // Ease function - ease in and out
    const easeInOut = (t: number) => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const easedProgress = easeInOut(progress);

    // Interpolate between positions
    const lng =
      oldPosition[0] + (newPosition[0] - oldPosition[0]) * easedProgress;
    const lat =
      oldPosition[1] + (newPosition[1] - oldPosition[1]) * easedProgress;

    // Update marker position
    marker.setLngLat([lng, lat]);

    // Continue animation if not complete
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  // Start animation
  requestAnimationFrame(animate);
};

// Process positions and update markers and lines
const processPositions = (
  positions: Position[],
  deviceName: string,
  deviceImage: string
): void => {
  if (!mapInstance || !positions.length) return;

  try {
    // Filter valid positions
    const validPositions = positions.filter((pos) => isValidPosition(pos));

    if (validPositions.length === 0) {
      console.warn("No valid positions to process");
      return;
    }

    // Set up click handler if not done yet
    setupClickHandler();

    // Check if we already have markers
    if (markers.length > 0) {
      // Update existing markers with smooth animation
      updateMarkerPositions(validPositions);

      // Fit to all positions
      setTimeout(() => {
        fitMapToPositions(validPositions);
      }, 500);
    } else {
      // First time - clear any existing markers
      clearMarkers();

      // Add markers
      addAllMarkers(validPositions, deviceName, deviceImage);

      // Add route line
      addRouteLine(validPositions);

      // Always fit map to show all points on initial load
      setTimeout(() => {
        fitMapToPositions(validPositions);
      }, 500);
    }

    console.log(`Processed ${validPositions.length} positions`);
  } catch (error) {
    console.error("Error processing positions:", error);
  }
};

// Update existing markers with new positions
const updateMarkerPositions = (positions: Position[]): void => {
  if (!mapInstance || !positions.length || markers.length === 0) return;

  // Only update if we have both positions and existing markers
  const hasStartMarker = markers.length > 0;
  const hasCurrentMarker = markers.length > 1;

  // Get the start and current position
  const firstPosition = positions[0];
  const lastPosition = positions[positions.length - 1];

  // Update start marker position if we have it
  if (hasStartMarker && isValidPosition(firstPosition)) {
    const startMarker = markers[0];
    moveMarker(startMarker, [
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
  if (hasCurrentMarker && isValidPosition(lastPosition)) {
    const currentMarker = markers[markers.length - 1];
    moveMarker(currentMarker, [
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
      const newPopup = createCurrentPopup(
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
    addRouteLine(positions);
  }
};

// Add all markers for the given positions
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
      createStartMarker(pos, deviceName, deviceImage);
    } else if (isLast) {
      createCurrentMarker(pos, deviceName, deviceImage);
    } else if (
      positions.length <= 10 ||
      index % Math.ceil(positions.length / 10) === 0
    ) {
      // For route markers, track them separately
      const marker = createRouteMarker(pos);
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

  // Auto-open last marker popup with delay
  if (markers.length > 0) {
    setTimeout(() => {
      const lastMarker = markers[markers.length - 1];
      if (lastMarker && lastMarker.getPopup()) {
        lastMarker.togglePopup();
      }
    }, 1500);
  }
};

// Add route line to the map
const addRouteLine = (positions: Position[]): void => {
  if (!mapInstance || positions.length < 2) return;

  try {
    // Filter valid positions
    const validPositions = positions.filter((pos) => isValidPosition(pos));

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
};

// Create a canvas to draw the arrow
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

// Add a larger arrow at the end of the route
const addEndArrow = (coordinates: number[][]): void => {
  if (!mapInstance || coordinates.length < 2) return;

  // Get the last two points to determine direction
  const lastPoint = coordinates[coordinates.length - 1];
  const secondLastPoint = coordinates[coordinates.length - 2];

  // Calculate bearing
  const bearing = getBearing(
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

// Calculate bearing between two points
const getBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  // Convert to radians
  const rlat1 = (lat1 * Math.PI) / 180;
  const rlng1 = (lng1 * Math.PI) / 180;
  const rlat2 = (lat2 * Math.PI) / 180;
  const rlng2 = (lng2 * Math.PI) / 180;

  // Calculate bearing
  const y = Math.sin(rlng2 - rlng1) * Math.cos(rlat2);
  const x =
    Math.cos(rlat1) * Math.sin(rlat2) - Math.sin(rlat1) * Math.cos(rlat2) * Math.cos(rlng2 - rlng1);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return bearing;
};

// Handle focus point event
const handleFocusPoint = (index: number, type: string, positions: Position[]): void => {
  if (
    !mapInstance ||
    positions.length === 0 ||
    index < 0 ||
    index >= positions.length
  )
    return;

  const position = positions[index];
  const zoom = type === "current" ? 16 : 15;

  // Center on position
  centerMapOnPosition(position, zoom);

  // Show popup
  setTimeout(() => {
    if (index < markers.length) {
      const marker = markers[index];
      if (marker && marker.getPopup()) {
        // Close other popups
        markers.forEach((m) => {
          const popup = m.getPopup();
          if (popup?.isOpen()) {
            popup.remove();
          }
        });

        // Open this popup
        marker.togglePopup();
      }
    }
  }, 1200);
};

// Update positions on the map
const updatePositions = (
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
};

// Update just the current position marker with new live data
const updateCurrentPosition = (
  position: Position,
  deviceName: string,
  deviceImage: string
): void => {
  if (!mapInstance || !isValidPosition(position) || markers.length === 0) return;
  
  // Get the current (last) marker
  const currentMarker = markers[markers.length - 1];
  if (!currentMarker) return;
  
  // Smoothly move the marker to the new position
  moveMarker(
    currentMarker,
    [position.longitude, position.latitude],
    750 // Faster transition for live updates
  );
  
  // Update popup content
  const popup = currentMarker.getPopup();
  if (popup) {
    // Create a new popup with updated content
    const newPopup = createCurrentPopup(
      position,
      deviceName,
      deviceImage
    );
    
    // Apply new popup to marker
    currentMarker.setPopup(newPopup);
    
    // If popup is open, update it
    if (popup.isOpen()) {
      // Temporarily remove and re-add popup to update content
      popup.remove();
      setTimeout(() => {
        currentMarker.togglePopup();
      }, 100);
    }
  }
  
  // Update route line if available - just the last segment
  if (mapInstance.getSource("route-arrow") && markers.length > 1) {
    // Get positions from all markers to update route
    const positions: Position[] = markers.map(marker => {
      const lngLat = marker.getLngLat();
      // For the last marker, use the new position
      if (marker === currentMarker) {
        return position;
      }
      // For other markers, use their current positions
      return {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      } as Position;
    });
    
    // Update route with all positions
    addRouteLine(positions);
  }
  
  // Update end arrow position and rotation
  updateEndArrow(position);
};

// Update just the end arrow position and rotation
const updateEndArrow = (position: Position): void => {
  if (!mapInstance || !isValidPosition(position) || markers.length < 2) return;
  
  try {
    // Get the last position and the one before it to calculate bearing
    const lastPoint = [position.longitude, position.latitude];
    
    // Get the second to last marker position
    const secondLastMarker = markers[markers.length - 2];
    const secondLastLngLat = secondLastMarker.getLngLat();
    const secondLastPoint = [secondLastLngLat.lng, secondLastLngLat.lat];
    
    // Calculate new bearing
    const bearing = getBearing(
      secondLastPoint[1] as number,
      secondLastPoint[0] as number,
      lastPoint[1] as number,
      lastPoint[0] as number
    );
    
    // Update end arrow if it exists
    if (mapInstance.getSource("end-arrow")) {
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
  } catch (error) {
    console.error("Error updating end arrow:", error);
  }
};

// Export all functions
const mapService = {
  initializeMap,
  removeMap,
  fitMapToPositions,
  centerMapOnPosition,
  setupClickHandler,
  clearMarkers,
  createStartMarker,
  createCurrentMarker,
  createRouteMarker,
  handleFocusPoint,
  updatePositions,
  updateCurrentPosition,
  addRouteLine,
};

export default mapService;
