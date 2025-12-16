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

export interface TrackedPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface MatchPair {
  driver: string;
  user: string;
}

export interface MatchSnapshotResponse {
  drivers: TrackedPoint[];
  users: TrackedPoint[];
  matchs: MatchPair[];
}
