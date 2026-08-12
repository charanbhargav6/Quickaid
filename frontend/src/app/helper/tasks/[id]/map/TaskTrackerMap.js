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

  const [routeLine, setRouteLine] = useState([]);

  useEffect(() => {
    // Get Helper's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setHelperPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error("Error getting helper location:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    // Fetch actual street route from OSRM API
    async function fetchRoute() {
      try {
        const waypoints = [];
        if (helperPos) waypoints.push(`${helperPos[1]},${helperPos[0]}`);
        waypoints.push(`${pickupPos[1]},${pickupPos[0]}`);
        if (dropoffPos) waypoints.push(`${dropoffPos[1]},${dropoffPos[0]}`);

        if (waypoints.length > 1) {
          const coordsStr = waypoints.join(';');
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            // OSRM returns [lng, lat], Leaflet needs [lat, lng]
            const latLngs = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRouteLine(latLngs);
          }
        }
      } catch (err) {
        console.error("Failed to fetch route:", err);
        // Fallback to straight line
        const fallback = [];
        if (helperPos) fallback.push(helperPos);
        fallback.push(pickupPos);
        if (dropoffPos) fallback.push(dropoffPos);
        setRouteLine(fallback);
      }
    }
    fetchRoute();
  }, [helperPos, pickupPos[0], pickupPos[1], dropoffPos?.[0], dropoffPos?.[1]]);

  // Determine center based on available points
  const center = helperPos || pickupPos;

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

        {/* Draw the street route line between the points */}
        {routeLine.length > 1 && (
          <Polyline 
            positions={routeLine} 
            color="var(--primary)" 
            weight={5} 
            opacity={0.8} 
          />
        )}
      </MapContainer>

      {/* Floating Info Overlay */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000,
        backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.2)', width: '320px', maxWidth: 'calc(100vw - 40px)'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 700 }}>📍 Route Details</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', marginBottom: '16px' }}>
          {helperPos && <div style={{ color: 'var(--text-secondary)' }}>🧑‍🔧 Your Location</div>}
          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>↓ {task.location_name || 'Pickup'}</div>
          {dropoffPos && <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>↓ {task.destination_name}</div>}
        </div>
        
        {helperPos && (
          <a 
            href={`https://www.google.com/maps/dir/?api=1&origin=${helperPos[0]},${helperPos[1]}&destination=${dropoffPos ? `${dropoffPos[0]},${dropoffPos[1]}` : `${pickupPos[0]},${pickupPos[1]}`}${dropoffPos ? `&waypoints=${pickupPos[0]},${pickupPos[1]}` : ''}&travelmode=driving`}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', fontSize: '1rem', fontWeight: 700 }}
          >
            🧭 Start Navigation
          </a>
        )}
      </div>
    </div>
  );
}
