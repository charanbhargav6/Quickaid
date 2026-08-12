'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { useEffect, useState } from 'react';

export default function TaskTrackerMap({ task }) {
  const [helperPos, setHelperPos] = useState(null);

  // If the task has no lat/lng, fallback to a default location (e.g. Mumbai)
  const pickupPos = task.lat && task.lng ? [task.lat, task.lng] : [19.0760, 72.8777];
  
  // If task has dropoff coordinates, use them, otherwise null
  const dropoffPos = task.destination_lat && task.destination_lng 
    ? [task.destination_lat, task.destination_lng] 
    : null;

  useEffect(() => {
    // Get Helper's current location to show on the map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setHelperPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error("Error getting helper location:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Determine center based on available points
  const center = helperPos || pickupPos;

  // Simple straight line route for visualization
  const routePositions = [];
  if (helperPos) routePositions.push(helperPos);
  routePositions.push(pickupPos);
  if (dropoffPos) routePositions.push(dropoffPos);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'relative' }}>
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Helper's Current Location */}
        {helperPos && (
          <Marker position={helperPos}>
            <Popup>
              <strong>🧑‍🔧 You are here</strong>
            </Popup>
          </Marker>
        )}

        {/* Pickup Location */}
        <Marker position={pickupPos}>
          <Popup>
            <div style={{ minWidth: '150px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Pickup</div>
              <strong style={{ display: 'block', marginBottom: '8px' }}>{task.location_name || 'Pickup Point'}</strong>
              <div style={{ fontSize: '0.85rem' }}>Client: {task.seeker?.full_name}</div>
            </div>
          </Popup>
        </Marker>

        {/* Dropoff Location (if applicable) */}
        {dropoffPos && (
          <Marker position={dropoffPos}>
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Dropoff</div>
                <strong>{task.destination_name || 'Dropoff Point'}</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Draw a route line between the points */}
        {routePositions.length > 1 && (
          <Polyline 
            positions={routePositions} 
            color="var(--primary)" 
            weight={4} 
            opacity={0.7} 
            dashArray="10, 10" 
          />
        )}
      </MapContainer>

      {/* Floating Info Overlay */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000,
        backgroundColor: 'var(--card-bg)', padding: '1rem', borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxWidth: '300px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>📍 Task Route</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
          {helperPos && <div style={{ color: 'var(--text-secondary)' }}>🧑‍🔧 Your Location</div>}
          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>↓ {task.location_name || 'Pickup'}</div>
          {dropoffPos && <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>↓ {task.destination_name}</div>}
        </div>
      </div>
    </div>
  );
}
