import React, { useEffect, useRef, useCallback } from 'react';
// We need to import from 'react-leaflet' but Typescript needs 'leaflet' types
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Pin, RulerState, MapCircle, LatLng, CellTowerMarker } from '../types';
import { getIconHtml, getTowerIconHtml } from './MapIcons';
import type { BoundingBox } from '../services/towerService';

interface MapViewProps {
  pins: Pin[];
  towers?: CellTowerMarker[];
  circles?: MapCircle[];
  drawingCircle?: { center: LatLng; radius: number; color: string } | null;
  rulerState: RulerState;
  onMapClick: (lat: number, lng: number) => void;
  onMapMouseMove?: (lat: number, lng: number) => void;
  onDeletePin: (id: string) => void;
  onUpdateCircle?: (id: string, newCenter: LatLng) => void;
  onDeleteCircle?: (id: string) => void;
  onBoundsChange?: (bounds: BoundingBox, zoom: number) => void;
  center?: { lat: number; lng: number };
  selectedPinId?: string | null;
}

// Component to handle map clicks and moves
const MapEvents = ({ 
    onClick, 
    onMouseMove,
    onBoundsChange,
}: { 
    onClick: (lat: number, lng: number) => void,
    onMouseMove?: (lat: number, lng: number) => void,
    onBoundsChange?: (bounds: BoundingBox, zoom: number) => void,
}) => {
  const map = useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e) {
        if (onMouseMove) onMouseMove(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
        if (onBoundsChange) {
            const bounds = map.getBounds();
            onBoundsChange(
                {
                    min_lat: bounds.getSouth(),
                    max_lat: bounds.getNorth(),
                    min_lon: bounds.getWest(),
                    max_lon: bounds.getEast(),
                },
                map.getZoom()
            );
        }
    },
  });
  return null;
};

// Component to fly to center when it changes
const MapFlyTo = ({ center }: { center?: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // Keep current zoom; just pan/animate to target
      map.flyTo([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ 
    pins, 
    towers = [],
    circles = [], 
    drawingCircle,
    rulerState, 
    onMapClick, 
    onMapMouseMove,
    onDeletePin, 
    onUpdateCircle,
    onDeleteCircle,
    onBoundsChange,
    center,
    selectedPinId
  }) => {

  // Helper to format radius
  const formatRadius = (r: number) => {
      if (r > 1000) return `${(r/1000).toFixed(2)} km`;
      return `${Math.round(r)} m`;
  };

  // Center handle icon for circles
  const createCenterHandleIcon = (color: string) => L.divIcon({
      html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3); cursor: move;"></div>`,
      className: 'circle-center-handle',
      iconSize: [14, 14],
      iconAnchor: [7, 7] // Center it
  });
  
  const centerHandleIconCache = useRef<Record<string, L.DivIcon>>({});
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const getCenterHandleIcon = useCallback((color: string) => {
      if (!centerHandleIconCache.current[color]) {
          centerHandleIconCache.current[color] = createCenterHandleIcon(color);
      }
      return centerHandleIconCache.current[color];
  }, []);

  useEffect(() => {
      if (selectedPinId) {
          const marker = markerRefs.current[selectedPinId];
          if (marker) {
              marker.openPopup();
          }
      }
  }, [selectedPinId]);
  
  return (
    <MapContainer
      center={[35.6892, 51.3890]} // Default to Tehran
      zoom={12}
      className="w-full h-full z-0"
    >
      {/* Use OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapEvents onClick={onMapClick} onMouseMove={onMapMouseMove} onBoundsChange={onBoundsChange} />
      <MapFlyTo center={center} />

      {/* Render Circles */}
      {circles.map(circle => (
          <React.Fragment key={circle.id}>
              {/* The Visual Circle */}
              <Circle
                center={[circle.center.lat, circle.center.lng]}
                radius={circle.radius}
                pathOptions={{ color: circle.color, fillColor: circle.color, fillOpacity: 0.2 }}
                eventHandlers={{
                    click: (e) => {
                        // Pass click to map unless it's a specific interaction
                        // But usually we want map click to handle deselection or new tools
                        // L.DomEvent.stopPropagation(e.originalEvent); 
                    }
                }}
              >
                 <Tooltip permanent direction="top" offset={[0, -circle.radius / 20]} opacity={0.8}>
                     <span>{formatRadius(circle.radius)}</span>
                 </Tooltip>
              </Circle>

              {/* The Draggable Center Handle */}
              <Marker
                position={[circle.center.lat, circle.center.lng]}
                icon={getCenterHandleIcon(circle.color)}
                draggable={!rulerState.isActive} // Disable dragging if using ruler to avoid conflicts
                eventHandlers={{
                    drag: (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        if (onUpdateCircle) {
                            onUpdateCircle(circle.id, { lat: position.lat, lng: position.lng });
                        }
                    },
                    click: (e) => {
                         L.DomEvent.stopPropagation(e.originalEvent);
                    }
                }}
              >
                  <Popup>
                      <div className="text-right text-xs" dir="rtl">
                          <p className="font-bold mb-2">دایره</p>
                          <p className="mb-2">شعاع: {formatRadius(circle.radius)}</p>
                          <button 
                            onClick={() => onDeleteCircle && onDeleteCircle(circle.id)}
                            className="text-red-500 hover:text-red-700 font-bold border border-red-200 px-2 py-1 rounded w-full"
                          >
                              حذف دایره
                          </button>
                      </div>
                  </Popup>
              </Marker>
          </React.Fragment>
      ))}

      {/* Render Drawing Circle Preview */}
      {drawingCircle && (
          <Circle 
            center={[drawingCircle.center.lat, drawingCircle.center.lng]}
            radius={drawingCircle.radius}
            pathOptions={{ color: drawingCircle.color, fillColor: drawingCircle.color, fillOpacity: 0.2, dashArray: '5, 5' }}
          />
      )}

      {/* Render Cell Towers */}
      {towers.map((tower) => {
        const towerIcon = L.divIcon({
            html: getTowerIconHtml(tower.radio_type),
            className: 'tower-pin-icon',
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -28],
        });

        return (
            <Marker
                key={`tower-${tower.id}`}
                position={[tower.lat, tower.lon]}
                icon={towerIcon}
            >
                <Popup>
                    <div className="text-right text-xs space-y-1" dir="rtl">
                        <p className="font-bold text-sm">
                            {tower.radio_type?.toUpperCase() ?? 'UNKNOWN'} - CID: {tower.cell_id ?? 'نامشخص'}
                        </p>
                        <p>MCC/MNC: {tower.mcc}/{tower.mnc}</p>
                        {tower.lac !== null && <p>LAC/TAC: {tower.lac}</p>}
                        {tower.pci !== null && <p>PCI: {tower.pci}</p>}
                        {tower.earfcn !== null && <p>EARFCN: {tower.earfcn}</p>}
                        {tower.tx_power !== null && <p>TX Power: {tower.tx_power} dBm</p>}
                        <p>Source: {tower.source}</p>
                    </div>
                </Popup>
            </Marker>
        );
      })}

      {/* Render Pins */}
      {pins.map((pin) => {
        // Create custom icon
        const icon = L.divIcon({
          html: getIconHtml(pin.shape, pin.color),
          className: 'custom-pin-icon', // defined in global css or style tag
          iconSize: [32, 32],
          iconAnchor: [16, 32], // Bottom center for pin, center for others? Adjusted for visual balance
          popupAnchor: [0, -32],
        });

        return (
          <Marker 
            key={pin.id} 
            position={[pin.position.lat, pin.position.lng]} 
            icon={icon}
            ref={(ref) => {
                // Track marker refs to open popup programmatically
                markerRefs.current[pin.id] = ref;
            }}
            eventHandlers={{
              click: (e) => {
                if (rulerState.isActive) {
                  // جلوگیری از انتشار کلیک به نقشه (برای جلوگیری از ثبت نقطه تکراری یا نادقیق)
                  L.DomEvent.stopPropagation(e.originalEvent);
                  // استفاده از مختصات دقیق پین برای خط‌کش
                  onMapClick(pin.position.lat, pin.position.lng);
                }
              }
            }}
          >
            {/* اگر خط‌کش فعال است، پاپ‌آپ را رندر نکن تا مزاحم نشود */}
            {!rulerState.isActive && (
              <Popup>
                <div className="text-right" dir="rtl">
                  <h3 className="font-bold text-lg">{pin.name}</h3>
                  {pin.description && <p className="text-sm text-gray-600 mb-2">{pin.description}</p>}
                  <p className="text-xs text-gray-500 font-mono mb-2">
                      {pin.position.lat.toFixed(4)}, {pin.position.lng.toFixed(4)}
                  </p>
                  <button 
                      onClick={() => onDeletePin(pin.id)}
                      className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-colors"
                  >
                      حذف پین
                  </button>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}

      {/* Render Ruler Lines */}
      {rulerState.points.length > 0 && (
         <>
            {rulerState.points.map((pt, idx) => (
                <Marker 
                    key={`ruler-${idx}`} 
                    position={[pt.lat, pt.lng]} 
                    icon={L.divIcon({
                        html: `<div style="background-color: #2563eb; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                        className: 'ruler-dot',
                        iconSize: [12, 12]
                    })} 
                />
            ))}
            <Polyline 
                positions={rulerState.points.map(p => [p.lat, p.lng])} 
                pathOptions={{ color: '#2563eb', dashArray: '5, 10' }} 
            />
         </>
      )}
    </MapContainer>
  );
};

export default MapView;
