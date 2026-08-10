'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon paths
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 15, { duration: 1.2 });
    }
  }, [location, map]);
  return null;
}

function LocationMarkers({ 
  position, setPosition, 
  destination, setDestination, 
  placingDestination, requiresTwoLocations 
}) {
  useMapEvents({
    click(e) {
      if (requiresTwoLocations && placingDestination) {
        setDestination(e.latlng);
      } else {
        setPosition(e.latlng);
      }
    },
  });

  return (
    <>
      {position && <Marker position={position} icon={requiresTwoLocations ? customIcon : redIcon} />}
      {requiresTwoLocations && destination && <Marker position={destination} icon={redIcon} />}
    </>
  );
}

export default function MapPicker({ 
  requiresTwoLocations,
  position, setPosition,
  destination, setDestination,
  placingDestination,
  initialLocation 
}) {
  const defaultCenter = initialLocation
    ? [initialLocation.lat, initialLocation.lng]
    : [12.9692, 79.1559]; // VIT Vellore

  return (
    <div style={{ height: '260px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToLocation location={initialLocation} />
        <LocationMarkers 
          position={position} setPosition={setPosition}
          destination={destination} setDestination={setDestination}
          placingDestination={placingDestination}
          requiresTwoLocations={requiresTwoLocations}
        />
      </MapContainer>
    </div>
  );
}
