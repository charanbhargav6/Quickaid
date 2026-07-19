'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

// Flies the map to a new center programmatically
function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 15, { duration: 1.2 });
    }
  }, [location, map]);
  return null;
}

// Click event handler to place a marker
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function MapPicker({ onChange, initialLocation }) {
  const defaultCenter = initialLocation
    ? [initialLocation.lat, initialLocation.lng]
    : [12.9692, 79.1559]; // VIT Vellore as fallback

  const [position, setPosition] = useState(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
  );

  // When parent passes a new initialLocation (GPS fix arrives), update the pin
  useEffect(() => {
    if (initialLocation && !position) {
      setPosition({ lat: initialLocation.lat, lng: initialLocation.lng });
      onChange?.({ lat: initialLocation.lat, lng: initialLocation.lng });
    }
  }, [initialLocation]);

  const handlePositionChange = (latlng) => {
    setPosition(latlng);
    if (onChange) {
      onChange({ lat: latlng.lat, lng: latlng.lng });
    }
  };

  return (
    <div style={{ height: '260px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToLocation location={initialLocation} />
        <LocationMarker position={position} setPosition={handlePositionChange} />
      </MapContainer>

      {!position && (
        <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Click anywhere on the map to drop a pin.
        </div>
      )}
    </div>
  );
}
