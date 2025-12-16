export type PinShape = 'pin' | 'circle' | 'star' | 'square' | 'triangle';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Pin {
  id: string;
  name: string;
  position: LatLng;
  color: string;
  shape: PinShape;
  description?: string;
}

export interface MapCircle {
  id: string;
  center: LatLng;
  radius: number; // in meters
  color: string;
}

export interface RulerState {
  isActive: boolean;
  points: LatLng[];
  distance: number | null; // in meters
}

export interface AIResponse {
  lat: number;
  lng: number;
  suggestedName: string;
  suggestedColor: string;
  suggestedShape: PinShape;
  description: string;
}

export interface CellTowerMarker {
  id: number;
  radio_type: string;
  mcc: number;
  mnc: number;
  lac: number | null;
  cell_id: number | null;
  pci: number | null;
  earfcn: number | null;
  lat: number;
  lon: number;
  tx_power: number | null;
  source: string;
}
