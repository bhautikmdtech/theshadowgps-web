import mapboxgl from "mapbox-gl";

interface Position {
  lng: number;
  lat: number;
  address?: string;
  tm?: number;
  speed?: number;
}

interface Device {
  _id?: string;
  deviceName?: string;
  imageUrl?: string;
}

interface DeviceMarkerProps {
  position: Position;
  device?: Device | null;
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
}

export const createDeviceMarker = ({
  position,
  device,
  mapRef,
}: DeviceMarkerProps): mapboxgl.Marker | null => {
  if (!mapRef.current) {
    console.error("Map instance is not available");
    return null;
  }

  try {
    const container = document.createElement("div");
    container.className = "relative device-marker z-1";
    container.innerHTML = `
      <div class="absolute w-10 h-10 bg-green-500 opacity-50 rounded-full animate-ping"></div>
      <div class="relative w-10 h-10 rounded-full border-2 border-white shadow-md flex items-center justify-center hover:scale-110 hover:shadow-lg transition-transform">
        ${
          device?.imageUrl
            ? `<img src="${device.imageUrl}" class="w-full rounded-full object-cover">`
            : `<span class="text-md font-bold text-white uppercase">${
                device?.deviceName?.charAt(0) || "D"
              }</span>`
        }
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: container, anchor: "center" })
      .setLngLat([position.lng, position.lat])
      .addTo(mapRef.current);

    const popup = new mapboxgl.Popup({
      offset: [0, 0],
      closeButton: true,
      closeOnClick: true,
      closeOnMove: true,
      maxWidth: "250px",
      className: "custom-popup z-2",
    }).setHTML(`
        <div class="p-2 shadow-lg border-0">
            <div class="flex items-center space-x-2 mb-2">
                ${
                  device?.imageUrl
                    ? `<img src="${device.imageUrl}" class="w-6 h-6 rounded-full object-cover" onerror="this.style.display='none'">`
                    : `<div class="w-6 h-6 bg-red-500 text-white flex items-center justify-center rounded-full text-xs font-bold">
                        ${device?.deviceName?.charAt(0) || "D"}
                      </div>`
                }
                <div>
                    <p class="font-bold text-gray-800 text-sm m-0">${
                      device?.deviceName || "Current Location"
                    }</p> 
                </div>
            </div>
            ${
              position.address
                ? `<div class="text-xs text-gray-600">Address: ${position.address}</div>`
                : ""
            }
            ${
              position.tm
                ? `<div class="text-xs text-gray-600">Time: ${new Date(
                    position.tm * 1000
                  ).toLocaleString()}</div>`
                : ""
            }
            ${
              position.speed
                ? `<div class="text-xs text-gray-600">Speed: ${Math.round(
                    position.speed
                  )} km/h</div>`
                : ""
            }
        </div>
      `);

    marker.setPopup(popup);
    return marker;
  } catch (error) {
    console.error("Error creating device marker:", error);
    return null;
  }
};

export const createStartMarker = ({
  position,
  device,
  mapRef,
}: DeviceMarkerProps): mapboxgl.Marker | null => {
  const map = mapRef.current;
  if (!map) {
    console.error("Map instance is not available");
    return null;
  }

  try {
    const el = document.createElement("div");
    el.className = "relative device-marker start";
    el.innerHTML = `
      <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-0 hover:scale-110 hover:shadow-lg transition-transform">
        <img src="/images/map/startIcon.svg" class="w-full rounded-full border-0 object-cover">
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([position.lng, position.lat])
      .addTo(map);

    const popup = new mapboxgl.Popup({
      offset: [0, 0],
      closeButton: true,
      closeOnClick: true,
      closeOnMove: true,
      maxWidth: "200px",
      className: "custom-popup z-2",
    }).setHTML(`
      <div class="p-2 shadow-lg border-0">
          <div class="flex items-center space-x-2 mb-2">
              ${
                device?.imageUrl
                  ? `<img src="${device.imageUrl}" class="w-6 h-6 rounded-full object-cover" onerror="this.style.display='none'">`
                  : `<div class="w-6 h-6 bg-red-500 text-white flex items-center justify-center rounded-full text-xs font-bold">
                          ${device?.deviceName?.charAt(0) || "D"}
                      </div>`
              }
              <div>
                  <p class="font-bold text-gray-800 text-sm m-0">${
                    device?.deviceName || "Start Location"
                  }</p> 
              </div>
          </div>
          ${
            position.address
              ? `<div class="text-xs text-gray-600">Address: ${position.address}</div>`
              : ""
          }
          ${
            position.tm
              ? `<div class="text-xs text-gray-600">Time: ${new Date(
                  position.tm * 1000
                ).toLocaleString()}</div>`
              : ""
          }
          ${
            position.speed
              ? `<div class="text-xs text-gray-600">Speed: ${Math.round(
                  position.speed
                )} km/h</div>`
              : ""
          }
      </div>
    `);

    marker.setPopup(popup);
    return marker;
  } catch (error) {
    console.error("Error creating start marker:", error);
    return null;
  }
};
