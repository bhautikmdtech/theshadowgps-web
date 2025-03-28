import mapboxgl from "mapbox-gl";
import type { Position } from "@/types/location";

// Mapbox access token
const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYWJoaXNoZWtiaGF0aWEwMiIsImEiOiJjbTZpZXlwd2kwOGhtMmpxMmo4cXQ1YzBvIn0.6VmLnWwyzFJ8PvgY6-3jXA";

// Set the access token for Mapbox
mapboxgl.accessToken = MAPBOX_TOKEN;

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

class MapService {
  private map: mapboxgl.Map | null = null;
  private markers: mapboxgl.Marker[] = [];
  private clickHandlerAdded = false;

  /**
   * Initialize the Mapbox map
   */
  initializeMap(container: HTMLElement): mapboxgl.Map {
    console.log("Initializing map");

    // Add styles for markers and popups
    addStyles();

    // Initialize map with a default center
    this.map = new mapboxgl.Map({
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
    this.addControls();

    // Add listeners
    this.addMapListeners();

    return this.map;
  }

  /**
   * Add standard controls to the map
   */
  private addControls(): void {
    if (!this.map) return;

    // Add attribution control
    this.map.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
      }),
      "bottom-left"
    );

    // Add navigation and other controls
    this.map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    this.map.addControl(new mapboxgl.FullscreenControl(), "bottom-right");
    this.map.addControl(new mapboxgl.ScaleControl(), "bottom-left");

    this.addCustomControls();
  }

  private addCustomControls(): void {
    if (!this.map) return;

    this.addCustomControl({
      title: "Show current location",
      className: "mapboxgl-button",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`,
      position: "bottom-right",
      onClick: () => {
        if (this.markers.length > 0) {
          const currentMarker = this.markers[this.markers.length - 1];
          if (currentMarker) {
            const lngLat = currentMarker.getLngLat();
            this.map?.flyTo({
              center: [lngLat.lng, lngLat.lat],
              zoom: 15,
              duration: 1000,
            });

            if (currentMarker.getPopup()) {
              setTimeout(() => {
                this.markers.forEach((m) => {
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

    this.addCustomControl({
      title: "Show entire trip",
      className: "mapboxgl-button",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`,
      position: "bottom-right",
      onClick: () => {
        // Get all positions from markers
        if (this.markers.length > 0) {
          const positions: Position[] = this.markers.map((marker) => {
            const lngLat = marker.getLngLat();
            return {
              latitude: lngLat.lat,
              longitude: lngLat.lng,
            } as Position;
          });

          // Fit map to show all positions
          this.fitMapToPositions(positions);

          // Close all popups
          this.markers.forEach((marker) => {
            if (marker.getPopup()?.isOpen()) {
              marker.getPopup()?.remove();
            }
          });
        }
      },
    });
  }

  /**
   * Add a custom control button to the map
   */
  private addCustomControl({
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
  }): void {
    if (!this.map) return;

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
    this.map.addControl(
      new CustomControl(title, className, icon, onClick),
      position
    );
  }

  /**
   * Add event listeners to the map
   */
  private addMapListeners(): void {
    if (!this.map) return;

    // Log when map is loaded
    this.map.on("load", () => {
      console.log("Map loaded successfully");

      // Enable scroll zoom after the map is loaded
      if (this.map) {
        this.map.scrollZoom.enable();
      }
    });

    // Event listener for map errors
    this.map.on("error", (e) => {
      console.error("Mapbox error:", e.error);
    });
  }

  /**
   * Set up click handler to close popups when clicking outside
   */
  setupClickHandler(): void {
    if (!this.map || this.clickHandlerAdded) return;

    // For closing popups when clicking outside markers
    this.map.on("click", (e) => {
      // Check if the click target is a marker or popup
      const element = e.originalEvent.target as HTMLElement;
      const isMarkerClick = element.closest(".mapboxgl-marker") !== null;
      const isPopupClick = element.closest(".mapboxgl-popup") !== null;

      // Only close popups if clicking outside markers and popups
      if (!isMarkerClick && !isPopupClick) {
        // Close all popups
        this.markers.forEach((marker) => {
          const popup = marker.getPopup();
          if (popup?.isOpen()) {
            popup.remove();
          }
        });
      }
    });

    this.clickHandlerAdded = true;
  }

  /**
   * Create a marker for the starting position
   */
  createStartMarker(
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Marker | null {
    if (!this.map || !this.isValidPosition(position)) return null;

    const markerElement = this.createStartMarkerElement(
      deviceName,
      deviceImage
    );
    const popup = this.createStartPopup(position, deviceName, deviceImage);

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
      markerElement.onclick = (e) => {
        e.stopPropagation(); // Prevent map click from triggering

        // First, show the entire trip
        if (this.markers.length > 0) {
          const positions: Position[] = this.markers.map((m) => {
            const lngLat = m.getLngLat();
            return {
              latitude: lngLat.lat,
              longitude: lngLat.lng,
            } as Position;
          });
          this.fitMapToPositions(positions);
        }

        // Then toggle this marker's popup
        setTimeout(() => {
          // Close other popups first
          this.markers.forEach((m) => {
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
      marker.addTo(this.map);
      this.markers.push(marker);

      return marker;
    } catch (error) {
      console.error("Error creating start marker:", error);
      return null;
    }
  }

  /**
   * Create a marker for the current position
   */
  createCurrentMarker(
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Marker | null {
    if (!this.map || !this.isValidPosition(position)) return null;

    const markerElement = this.createDeviceMarkerElement(
      deviceName,
      deviceImage
    );
    const popup = this.createCurrentPopup(position, deviceName, deviceImage);

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
      markerElement.onclick = (e) => {
        e.stopPropagation(); // Prevent map click from triggering

        // First, show the entire trip
        if (this.markers.length > 0) {
          const positions: Position[] = this.markers.map((m) => {
            const lngLat = m.getLngLat();
            return {
              latitude: lngLat.lat,
              longitude: lngLat.lng,
            } as Position;
          });
          this.fitMapToPositions(positions);
        }

        // Then toggle this marker's popup
        setTimeout(() => {
          // Close other popups first
          this.markers.forEach((m) => {
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
      marker.addTo(this.map);
      this.markers.push(marker);

      return marker;
    } catch (error) {
      console.error("Error creating current marker:", error);
      return null;
    }
  }

  /**
   * Create a route point marker
   */
  createRouteMarker(position: Position): mapboxgl.Marker | null {
    if (!this.map || !this.isValidPosition(position)) return null;

    const markerElement = this.createEventMarkerElement();

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
      marker.addTo(this.map);
      this.markers.push(marker);

      return marker;
    } catch (error) {
      console.error("Error creating route marker:", error);
      return null;
    }
  }

  /**
   * Process positions and update markers and lines
   */
  private processPositions(
    positions: Position[],
    deviceName: string,
    deviceImage: string
  ): void {
    if (!this.map || !positions.length) return;

    try {
      // Filter valid positions
      const validPositions = positions.filter((pos) =>
        this.isValidPosition(pos)
      );

      if (validPositions.length === 0) {
        console.warn("No valid positions to process");
        return;
      }

      // Set up click handler if not done yet
      this.setupClickHandler();

      // Check if we already have markers
      if (this.markers.length > 0) {
        // Update existing markers with smooth animation
        this.updateMarkerPositions(validPositions);

        // Fit to all positions
        setTimeout(() => {
          this.fitMapToPositions(validPositions);
        }, 500);
      } else {
        // First time - clear any existing markers
        this.clearMarkers();

        // Add markers
        this.addAllMarkers(validPositions, deviceName, deviceImage);

        // Add route line
        this.addRouteLine(validPositions);

        // Always fit map to show all points on initial load
        setTimeout(() => {
          this.fitMapToPositions(validPositions);
        }, 500);
      }

      console.log(`Processed ${validPositions.length} positions`);
    } catch (error) {
      console.error("Error processing positions:", error);
    }
  }

  /**
   * Update existing markers with new positions
   * This function will move markers rather than recreate them
   */
  updateMarkerPositions(positions: Position[]): void {
    if (!this.map || !positions.length || this.markers.length === 0) return;

    // Only update if we have both positions and existing markers
    const hasStartMarker = this.markers.length > 0;
    const hasCurrentMarker = this.markers.length > 1;

    // Get the start and current position
    const firstPosition = positions[0];
    const lastPosition = positions[positions.length - 1];

    // Update start marker position if we have it
    if (hasStartMarker && this.isValidPosition(firstPosition)) {
      const startMarker = this.markers[0];
      this.moveMarker(startMarker, [
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
        const newPopup = this.createStartPopup(
          firstPosition,
          startMarker.getElement().getAttribute("data-name") || "",
          startMarker.getElement().getAttribute("data-image") || ""
        );

        // Apply new popup to marker
        startMarker.setPopup(newPopup);
      }
    }

    // Update current marker position if we have it
    if (hasCurrentMarker && this.isValidPosition(lastPosition)) {
      const currentMarker = this.markers[this.markers.length - 1];
      this.moveMarker(currentMarker, [
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
        const newPopup = this.createCurrentPopup(
          lastPosition,
          currentMarker.getElement().getAttribute("data-name") || "",
          currentMarker.getElement().getAttribute("data-image") || ""
        );

        // Apply new popup to marker
        currentMarker.setPopup(newPopup);
      }
    }

    // Update route line if available
    if (this.map.getSource("route-arrow")) {
      this.addRouteLine(positions);
    }
  }

  /**
   * Move a marker to a new position with animation
   * @param marker The marker to move
   * @param newPosition The new position to move to
   * @param duration Animation duration in milliseconds
   */
  moveMarker(
    marker: mapboxgl.Marker,
    newPosition: [number, number],
    duration: number = 1500
  ): void {
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
  }

  /**
   * Add all markers for the given positions
   */
  private addAllMarkers(
    positions: Position[],
    deviceName: string,
    deviceImage: string
  ): void {
    if (!this.map || positions.length === 0) return;

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
        this.createStartMarker(pos, deviceName, deviceImage);
      } else if (isLast) {
        this.createCurrentMarker(pos, deviceName, deviceImage);
      } else if (
        positions.length <= 10 ||
        index % Math.ceil(positions.length / 10) === 0
      ) {
        // For route markers, track them separately
        const marker = this.createRouteMarker(pos);
        if (marker) {
          routeMarkers.push(marker);

          // Initially hide route markers if zoomed out
          if (this.map && this.map.getZoom() < 12) {
            marker.getElement().style.display = "none";
          }
        }
      }
    });

    // Add zoom change handler to show/hide route markers
    if (this.map && routeMarkers.length > 0) {
      this.map.on("zoom", () => {
        const currentZoom = this.map?.getZoom() || 0;

        // Show/hide route markers based on zoom level
        routeMarkers.forEach((marker) => {
          marker.getElement().style.display =
            currentZoom >= 12 ? "block" : "none";
        });
      });
    }

    // Auto-open last marker popup with delay
    if (this.markers.length > 0) {
      setTimeout(() => {
        const lastMarker = this.markers[this.markers.length - 1];
        if (lastMarker && lastMarker.getPopup()) {
          lastMarker.togglePopup();
        }
      }, 1500);
    }
  }

  clearMarkers(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];
  }

  private isValidPosition(position: Position): boolean {
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
  }

  addRouteLine(positions: Position[]): void {
    if (!this.map || positions.length < 2) return;

    try {
      // Filter valid positions
      const validPositions = positions.filter((pos) =>
        this.isValidPosition(pos)
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
      if (!this.map.hasImage("arrow")) {
        this.createArrowImage();
      }

      // Add arrow layer if it doesn't exist
      if (!this.map.getSource("route-arrow")) {
        // Add source for the arrow line
        this.map.addSource("route-arrow", {
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
        this.map.addLayer({
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
        this.map.addLayer({
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
        const source = this.map.getSource(
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
      if (!this.map.getSource("route")) {
        this.map.addSource("route", {
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

        // Add a dashed background line
        // this.map.addLayer({
        //   id: "route-background",
        //   type: "line",
        //   source: "route",
        //   layout: {
        //     "line-join": "round",
        //     "line-cap": "round",
        //   },
        //   paint: {
        //     "line-color": "#23C16B",
        //     "line-width": 4,
        //     "line-opacity": 0.5,
        //     "line-dasharray": [0, 2, 1],
        //   },
        // });
      } else {
        // Update existing source
        const source = this.map.getSource("route") as mapboxgl.GeoJSONSource;
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
      this.addEndArrow(coordinates);
    } catch (error) {
      console.error("Error adding route line:", error);
    }
  }

  private createArrowImage(): void {
    if (!this.map) return;

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
      this.map.addImage("arrow", {
        width: size,
        height: size,
        data: new Uint8Array(ctx.getImageData(0, 0, size, size).data),
      });
    }
  }

  /**
   * Add a larger arrow at the end of the route
   */
  private addEndArrow(coordinates: number[][]): void {
    if (!this.map || coordinates.length < 2) return;

    // Get the last two points to determine direction
    const lastPoint = coordinates[coordinates.length - 1];
    const secondLastPoint = coordinates[coordinates.length - 2];

    // Calculate bearing
    const bearing = this.getBearing(
      secondLastPoint[1],
      secondLastPoint[0],
      lastPoint[1],
      lastPoint[0]
    );

    // Add end arrow source if it doesn't exist
    if (!this.map.getSource("end-arrow")) {
      this.map.addSource("end-arrow", {
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
      this.map.addLayer({
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
      const source = this.map.getSource("end-arrow") as mapboxgl.GeoJSONSource;
      source.setData({
        type: "Feature",
        properties: { bearing },
        geometry: {
          type: "Point",
          coordinates: lastPoint,
        },
      });
    }
  }

  /**
   * Calculate bearing between two points
   */
  private getBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
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
  }

  /**
   * Fit the map to show all positions
   */
  fitMapToPositions(positions: Position[]): void {
    if (!this.map || positions.length === 0) return;

    try {
      const bounds = new mapboxgl.LngLatBounds();
      let validPointsAdded = 0;

      // Extend bounds with valid positions
      positions.forEach((pos) => {
        if (this.isValidPosition(pos)) {
          bounds.extend([pos.longitude, pos.latitude]);
          validPointsAdded++;
        }
      });

      if (validPointsAdded === 0) {
        console.warn("No valid coordinates to fit bounds");
        return;
      }

      // Fit map to bounds with padding
      this.map.fitBounds(bounds, {
        padding: { top: 120, bottom: 120, left: 120, right: 120 },
        maxZoom: 15,
        duration: 1000,
      });
    } catch (error) {
      console.error("Error fitting bounds:", error);

      // Fallback to last position
      if (positions.length > 0) {
        this.centerMapOnPosition(positions[positions.length - 1]);
      }
    }
  }

  /**
   * Center the map on a specific position
   */
  centerMapOnPosition(position: Position, zoom: number = 14): void {
    if (!this.map || !this.isValidPosition(position)) return;

    try {
      this.map.flyTo({
        center: [position.longitude, position.latitude],
        zoom,
        essential: true,
        duration: 1000,
      });

      // Show popup for the position
      setTimeout(() => {
        const marker = this.markers.find((m) => {
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
  }

  /**
   * Handle focus point event
   */
  handleFocusPoint(index: number, type: string, positions: Position[]): void {
    if (
      !this.map ||
      positions.length === 0 ||
      index < 0 ||
      index >= positions.length
    )
      return;

    const position = positions[index];
    const zoom = type === "current" ? 16 : 15;

    // Center on position
    this.centerMapOnPosition(position, zoom);

    // Show popup
    setTimeout(() => {
      if (index < this.markers.length) {
        const marker = this.markers[index];
        if (marker && marker.getPopup()) {
          // Close other popups
          this.markers.forEach((m) => {
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
  }

  /**
   * Remove the map and clean up
   */
  removeMap(): void {
    if (this.map) {
      this.clearMarkers();
      this.map.remove();
      this.map = null;
      this.clickHandlerAdded = false;
    }
  }

  private createStartMarkerElement(
    deviceName: string,
    deviceImage: string
  ): HTMLElement {
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
        this.addInitials(el, deviceName, "16px");
      };
      el.appendChild(img);
    } else {
      this.addInitials(el, deviceName, "16px");
    }

    return container;
  }

  private createDeviceMarkerElement(
    deviceName: string,
    deviceImage: string
  ): HTMLElement {
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
        this.addInitials(el, deviceName);
      };
      el.appendChild(img);
    } else {
      this.addInitials(el, deviceName);
    }

    return container;
  }

  private createEventMarkerElement(): HTMLElement {
    const el = document.createElement("div");
    el.className = "event-marker";
    el.style.width = "14px";
    el.style.height = "14px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = "rgba(56, 135, 190, 0.8)";
    el.style.border = "2px solid white";
    el.style.boxShadow = "0 1px 5px rgba(0,0,0,0.3)";
    return el;
  }

  /**
   * Add initials to a marker element
   */
  private addInitials(
    el: HTMLElement,
    name: string,
    fontSize: string = "20px"
  ): void {
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
  }

  /**
   * Create popup for start marker
   */
  private createStartPopup(
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Popup {
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
  }

  /**
   * Create popup for current marker
   */
  private createCurrentPopup(
    position: Position,
    deviceName: string,
    deviceImage: string
  ): mapboxgl.Popup {
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
  }

  /**
   * Process all positions and create appropriate markers
   */
  updatePositions(
    positions: Position[],
    deviceName: string,
    deviceImage: string
  ): void {
    if (!this.map) return;

    // Process positions
    if (!this.map.loaded()) {
      console.log("Map not loaded yet, waiting...");
      this.map.once("load", () => {
        setTimeout(
          () => this.processPositions(positions, deviceName, deviceImage),
          100
        );
      });
    } else {
      setTimeout(
        () => this.processPositions(positions, deviceName, deviceImage),
        100
      );
    }
  }
  
  /**
   * Update just the current position marker with new live data
   * This is optimized for socket-based position updates
   */
  updateCurrentPosition(
    position: Position,
    deviceName: string,
    deviceImage: string
  ): void {
    if (!this.map || !this.isValidPosition(position) || this.markers.length === 0) return;
    
    // Get the current (last) marker
    const currentMarker = this.markers[this.markers.length - 1];
    if (!currentMarker) return;
    
    // Smoothly move the marker to the new position
    this.moveMarker(
      currentMarker,
      [position.longitude, position.latitude],
      750 // Faster transition for live updates
    );
    
    // Update popup content
    const popup = currentMarker.getPopup();
    if (popup) {
      // Create a new popup with updated content
      const newPopup = this.createCurrentPopup(
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
    if (this.map.getSource("route-arrow") && this.markers.length > 1) {
      // Get positions from all markers to update route
      const positions: Position[] = this.markers.map(marker => {
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
      this.addRouteLine(positions);
    }
    
    // Update end arrow position and rotation
    this.updateEndArrow(position);
  }
  
  /**
   * Update just the end arrow position and rotation
   */
  private updateEndArrow(position: Position): void {
    if (!this.map || !this.isValidPosition(position) || this.markers.length < 2) return;
    
    try {
      // Get the last position and the one before it to calculate bearing
      const lastPoint = [position.longitude, position.latitude];
      
      // Get the second to last marker position
      const secondLastMarker = this.markers[this.markers.length - 2];
      const secondLastLngLat = secondLastMarker.getLngLat();
      const secondLastPoint = [secondLastLngLat.lng, secondLastLngLat.lat];
      
      // Calculate new bearing
      const bearing = this.getBearing(
        secondLastPoint[1] as number,
        secondLastPoint[0] as number,
        lastPoint[1] as number,
        lastPoint[0] as number
      );
      
      // Update end arrow if it exists
      if (this.map.getSource("end-arrow")) {
        const source = this.map.getSource("end-arrow") as mapboxgl.GeoJSONSource;
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
  }
}

// Create and export a singleton instance
const mapService = new MapService();
export default mapService;
