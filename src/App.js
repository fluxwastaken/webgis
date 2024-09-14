import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';  
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Define the custom marker icon
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [18, 30], 
  iconAnchor: [10, 28], 
  popupAnchor: [1, -34], 
  shadowSize: [25, 25]  
});

function App() {
  const mapRef = useRef(null);
  const [selectedPopup, setSelectedPopup] = useState(null);

  // Initial center and zoom level
  const initialCenter = [14.8370, 120.7398];
  const initialZoom = 17;

  // Define marker positions and detailed information
  const markers = [
    { position: [14.8370, 120.7346], details: { location: "Sto. Niño", floodLevel: "Moderate", warning: "Caution advised", duration: "2 hours" } },
    { position: [14.8377, 120.7365], details: { location: "Sto. Niño", floodLevel: "High", warning: "Evacuation recommended", duration: "3 hours" } },
    { position: [14.83775, 120.7375], details: { location: "Sto. Niño", floodLevel: "Low", warning: "Stay alert", duration: "1 hour" } },
    { position: [14.8386, 120.7395], details: { location: "Sto. Niño", floodLevel: "Very High", warning: "Immediate action required", duration: "4 hours" } }
  ];

  // Define color values
  const colors = {
    yellow: "rgba(242, 186, 73, 0.5)", 
    orange: "rgba(252, 76, 2, 0.5)",      
    red: "rgba(180, 0, 50, 0.5)"            
  };

  // Define paths
  const paths = [
    { positions: [[14.8370, 120.7346], [14.8373, 120.7350], [14.83755, 120.7355], [14.8377, 120.7363], [14.8377, 120.7365]], color: colors.yellow, weight: 15 },
    { positions: [[14.8377, 120.7365], [14.83775, 120.7375]], color: colors.orange, weight: 15 },
    { positions: [[14.83775, 120.7375], [14.83793, 120.73825], [14.83823, 120.7389], [14.8386, 120.7395]], color: colors.red, weight: 15 },
    { positions: [[14.8386, 120.7395], [14.8400, 120.7415]], color: colors.red, weight: 15 }
  ];

  return (
    <div className="map-container">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="map"
        whenCreated={map => { mapRef.current = map; }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            icon={defaultIcon}
            eventHandlers={{
              click: () => setSelectedPopup(marker.details),
            }}
          />
        ))}
        {paths.map((path, index) => (
          <Polyline
            key={index}
            positions={path.positions}
            color={path.color}
            weight={path.weight}
          />
        ))}
      </MapContainer>
      <div className='sidemenu'>
        <h3 style={{marginTop: 0}}>Legend</h3>
        <div className='legend-item'>
          <div className='legend-color' style={{ backgroundColor: colors.yellow }}></div>
          <div>Low Flood Level: 0 - 0.25 m</div>
        </div>
        <div className='legend-item'>
          <div className='legend-color' style={{ backgroundColor: colors.orange }}></div>
          <div>Medium Flood Level: 0.25 -  0.50 m</div>
        </div>
        <div className='legend-item'>
          <div className='legend-color' style={{ backgroundColor: colors.red }}></div>
          <div>High Flood Level: &gt; 0.50 m</div>
        </div>
      </div>
      {selectedPopup && (
        <div className='popup-card'>
          <button className='close-btn' onClick={() => setSelectedPopup(null)}>×</button>
          <h3 style={{marginTop: '3px'}}>Flood Information</h3>
          <p><strong>Location:</strong> {selectedPopup.location}</p>
          <p><strong>Current Flood Level:</strong> {selectedPopup.floodLevel}</p>
          <p><strong>Warning Message:</strong> {selectedPopup.warning}</p>
          <p><strong>Expected Duration of Flood:</strong> {selectedPopup.duration}</p>
        </div>
      )}
    </div>
  );
}

export default App;