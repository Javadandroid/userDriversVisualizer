import React from 'react';
import { MapPin, Circle, Star, Square, Triangle } from 'lucide-react';
import { PinShape } from '../types';

interface MapIconProps {
  shape: PinShape;
  color: string;
  size?: number;
}

export const MapIcon: React.FC<MapIconProps> = ({ shape, color, size = 32 }) => {
  const commonProps = {
    size,
    color,
    fill: color,
    fillOpacity: 0.6,
    strokeWidth: 2,
    stroke: 'white' // White border for better visibility
  };

  switch (shape) {
    case 'circle':
      return <Circle {...commonProps} />;
    case 'star':
      return <Star {...commonProps} />;
    case 'square':
      return <Square {...commonProps} />;
    case 'triangle':
      return <Triangle {...commonProps} />;
    case 'pin':
    default:
      return <MapPin {...commonProps} fillOpacity={1} />; // MapPin looks better solid
  }
};

// Helper to get HTML string for Leaflet DivIcon
export const getIconHtml = (shape: PinShape, color: string): string => {
    // Basic SVG strings matching Lucide structure roughly for the marker
    const size = 32;
    const stroke = "white";
    const strokeWidth = 2;
    const fillOpacity = 0.6;
    
    let path = '';
    
    if (shape === 'pin') {
         return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`;
    } else if (shape === 'circle') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
    } else if (shape === 'square') {
         return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`;
    } else if (shape === 'star') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    } else if (shape === 'triangle') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>`;
    }

    return '';
};

const towerIconMap: Record<string, string> = {
    gsm: new URL('../cell_icons/2g.ico', import.meta.url).href,
    umts: new URL('../cell_icons/3g.ico', import.meta.url).href,
    lte: new URL('../cell_icons/4g.ico', import.meta.url).href,
    nr: new URL('../cell_icons/5g.ico', import.meta.url).href,
};

export const getTowerIconHtml = (radioType?: string): string => {
    const normalized = radioType?.toLowerCase() ?? 'gsm';
    const iconSrc = towerIconMap[normalized] ?? towerIconMap['gsm'];

    return `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        <img src="${iconSrc}" alt="${normalized}" style="width:24px;height:24px;object-fit:contain;" />
    </div>`;
};
