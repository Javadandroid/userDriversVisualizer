import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
// We need to import from 'react-leaflet' but Typescript needs 'leaflet' types
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Pin, RulerState, MapCircle, LatLng, TrackedPoint, MatchPair } from '../types';
import { getIconHtml, getDriverIconHtml, getUserIconHtml, type UserAvatarVariant } from './MapIcons';

interface MapViewProps {
  pins: Pin[];
  drivers?: TrackedPoint[];
  users?: TrackedPoint[];
  matchs?: MatchPair[];
  showEntityTooltips?: boolean;
  circles?: MapCircle[];
  drawingCircle?: { center: LatLng; radius: number; color: string } | null;
  rulerState: RulerState;
  onMapClick: (lat: number, lng: number) => void;
  onMapMouseMove?: (lat: number, lng: number) => void;
  onDeletePin: (id: string) => void;
  onUpdateCircle?: (id: string, newCenter: LatLng) => void;
  onDeleteCircle?: (id: string) => void;
  center?: { lat: number; lng: number };
  selectedPinId?: string | null;
}

// Component to handle map clicks and moves
const MapEvents = ({ 
    onClick, 
    onMouseMove,
}: { 
    onClick: (lat: number, lng: number) => void,
    onMouseMove?: (lat: number, lng: number) => void,
}) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e) {
        if (onMouseMove) onMouseMove(e.latlng.lat, e.latlng.lng);
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
    drivers = [],
    users = [],
    matchs = [],
    showEntityTooltips = true,
    circles = [], 
    drawingCircle,
    rulerState, 
    onMapClick, 
    onMapMouseMove,
    onDeletePin, 
    onUpdateCircle,
    onDeleteCircle,
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
  const entityIconCache = useRef<Record<string, L.DivIcon>>({});

  const getEntityIcon = useCallback((kind: 'driver' | 'user', variant?: UserAvatarVariant) => {
      const key = kind === 'user' ? `entity:user:${variant ?? 'man'}` : `entity:${kind}`;
      if (!entityIconCache.current[key]) {
          entityIconCache.current[key] = L.divIcon({
              html: kind === 'driver' ? getDriverIconHtml() : getUserIconHtml(variant ?? 'man'),
              className: kind === 'driver' ? 'driver-icon' : 'user-icon',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
          });
      }
      return entityIconCache.current[key];
  }, []);

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

  const driversById = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const usersById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const lastMatch = matchs.length > 0 ? matchs[matchs.length - 1] : null;
  const [hoveredDriverId, setHoveredDriverId] = useState<string | null>(null);

  const pickUserAvatarVariant = useCallback((id: string): UserAvatarVariant => {
      // Deterministic "random": keeps the same user icon across refreshes.
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
          hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
      }
      return hash % 2 === 0 ? 'man' : 'girl';
  }, []);

  const EntityTooltip = useCallback(
      ({ kind, point }: { kind: 'driver' | 'user'; point: TrackedPoint }) => {
          const title = kind === 'driver' ? 'Driver' : 'User';
          const badgeClass = kind === 'driver'
              ? 'bg-amber-500/15 text-amber-700 border-amber-200'
              : 'bg-sky-500/15 text-sky-700 border-sky-200';

          return (
              <div className="rounded-md border bg-white/95 shadow-sm px-2 py-1 text-[11px] text-slate-800 min-w-[160px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${badgeClass}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          <span className="font-semibold">{title}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">hover</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">id</span>
                      <span className="font-mono text-[10px] truncate max-w-[120px]" title={point.id}>{point.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">lat</span>
                      <span className="font-mono text-[10px] dir-ltr">{point.lat.toFixed(5)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">lng</span>
                      <span className="font-mono text-[10px] dir-ltr">{point.lng.toFixed(5)}</span>
                  </div>
              </div>
          );
      },
      []
  );
  
  return (
    <MapContainer
      center={[35.6892, 51.3890]} // Default to Tehran
      zoom={12}
      className="w-full h-full z-0"
      preferCanvas
    >
      {/* Use OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapEvents onClick={onMapClick} onMouseMove={onMapMouseMove} />
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

      {/* Render Match Lines (dashed) */}
      {matchs.map((m, idx) => {
          const d = driversById.get(m.driver);
          const u = usersById.get(m.user);
          if (!d || !u) return null;
          const isLast = lastMatch?.driver === m.driver && lastMatch?.user === m.user && idx === matchs.length - 1;
          const isActive = hoveredDriverId !== null && m.driver === hoveredDriverId;
          return (
              <Polyline
                  key={`match-${idx}-${m.driver}-${m.user}`}
                  positions={[
                      [d.lat, d.lng],
                      [u.lat, u.lng],
                  ]}
                  pathOptions={{
                      color: isLast ? '#ef4444' : (isActive ? '#f59e0b' : '#64748b'),
                      weight: isLast ? 3 : (isActive ? 4 : 2),
                      dashArray: '4 8',
                      opacity: isLast ? 0.9 : (isActive ? 0.95 : 0.6),
                      className: `match-line${isActive ? ' match-line--active' : ''}${isLast ? ' match-line--last' : ''}`,
                  }}
              >
                  <Tooltip sticky direction="top" opacity={0.9}>
                      <div className="text-xs" dir="rtl">
                          driver: {m.driver}<br />
                          user: {m.user}
                      </div>
                  </Tooltip>
              </Polyline>
          );
      })}

      {/* Render Drivers */}
      {drivers.map((d) => (
          <Marker
              key={`driver-${d.id}`}
              position={[d.lat, d.lng]}
              icon={getEntityIcon('driver')}
              eventHandlers={{
                  mouseover: () => setHoveredDriverId(d.id),
                  mouseout: () => setHoveredDriverId((cur) => (cur === d.id ? null : cur)),
              }}
          >
              {showEntityTooltips && (
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                      <EntityTooltip kind="driver" point={d} />
                  </Tooltip>
              )}
          </Marker>
      ))}

      {/* Render Users */}
      {users.map((u) => (
          <Marker
              key={`user-${u.id}`}
              position={[u.lat, u.lng]}
              icon={getEntityIcon('user', pickUserAvatarVariant(u.id))}
          >
              {showEntityTooltips && (
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                      <EntityTooltip kind="user" point={u} />
                  </Tooltip>
              )}
          </Marker>
      ))}

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
