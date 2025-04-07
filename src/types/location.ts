export interface Position {
  lat: number;
  lng: number;
  speed?: number;
  direction?: number;
  tm?: number;
  address?: string;
}

export interface DeviceInfo {
  _id: string;
  deviceName: string;
  imageUrl?: string;
}
