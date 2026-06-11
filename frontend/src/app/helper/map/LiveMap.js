'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

export default function LiveMap({ tasks, onAccept, onCounterOffer, userLocation }) {
  // Default to a central location (Mumbai) if no user location
  const center = userLocation || [19.0760, 72.8777];

  return (
    <div style={{ height: 'calc(100vh - 150px)', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {tasks.map(task => {
          // If task doesn't have lat/lng, we could skip or plot at a default location. 
          // For safety, we only plot tasks with coordinates.
          if (!task.lat || !task.lng) return null;
          
          return (
            <Marker key={task.id} position={[task.lat, task.lng]}>
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>{task.title}</h3>
                  <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{task.description}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '1.2rem' }}>₹{task.pay}</span>
                    <span className="badge badge-blue">Open</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '8px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept(task.id);
                      }}
                    >
                      Accept Task
                    </button>
                    <button 
                      className="btn" 
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-light)', color: 'var(--text-dark)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCounterOffer) onCounterOffer(task);
                      }}
                    >
                      Counter Offer
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
