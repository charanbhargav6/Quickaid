'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

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

export default function MapPicker({ onChange }) {
  // Default to a central location (Mumbai)
  const defaultCenter = [19.0760, 72.8777];
  const [position, setPosition] = useState(null);

  const handlePositionChange = (latlng) => {
    setPosition(latlng);
    if (onChange) {
      onChange({ lat: latlng.lat, lng: latlng.lng });
    }
  };

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
