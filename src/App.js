import React, { useState, useRef, useEffect } from 'react';
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
  const initialCenter = [14.8375, 120.7379];
  const initialZoom = 18;

  // Define color values
  const colors = {
    green: "rgba(11, 156, 49, 0.5)", 
    yellow: "rgba(252, 76, 2, 0.5)",      
    red: "rgba(180, 0, 50, 0.5)"            
  };
  
  // Define the warning levels for flood levels
  const legendItems = {
    greenWarning1: "Gutter deep flood", 
    greenWarning2: "Half-knee deep flood", 
    yellowWarning1: "Half-tire deep flood",  
    yellowWarning2: "Knee deep flood",  
    redWarning1: "Tire deep flood", 
    redWarning2: "Waist deep flood", 
    redWarning3: "Chest deep flood" 
  };
  
  // Function to determine the appropriate warning based on flood level
  const getFloodWarning = (floodLevel) => {
    const level = parseFloat(floodLevel); // Convert string to float
    if (isNaN(level)) {
      return "No data available";  // If not a valid number, return a default message
    } else if (level <= 0.20) {
      return legendItems.greenWarning1;
    } else if (level <= 0.25) {
      return legendItems.greenWarning2;
    } else if (level <= 0.33) {
      return legendItems.yellowWarning1;
    } else if (level <= 0.50) {
      return legendItems.yellowWarning2;
    } else if (level <= 0.66) {
      return legendItems.redWarning1;
    } else if (level <= 0.94) {
      return legendItems.redWarning2;
    } else {
      return legendItems.redWarning3;
    }
  };

  // Function to determine the path color based on flood level
  const getPathColor = (floodLevel) => {
    const level = parseFloat(floodLevel);
    if (isNaN(level)) {
      return "000000";  // Default to transparent if no valid data
    } else if (level <= 0.25) {
      return colors.green;
    } else if (level <= 0.50) {
      return colors.yellow;
    } else if (level > 0.50){
      return colors.red;
    }
  };  

  //set data from backend
  const [data, setdata] = useState({
    created_at: "",
    entry_id: "",
    field1: "",
    field2: "",
    field3: "",
    field4: ""
  });

  const [smoothingData, setSmoothingData] = useState({
    device1: "",
    device2: "",
    device3: "",
    device4: ""
  });

  // Define marker positions and detailed information
  const markers = [
    { position: [14.83753, 120.7355], details: { deviceNo: "Device 4", location: "Iglesia ni Kristo: Lokal ng Hangonoy", floodLevel: data.field4 ? data.field4 + " m" : "No data available.", warning: getFloodWarning(data.field4), forecast: smoothingData.device4 ? smoothingData.device4 + " m" : "No data available."}},
    { position: [14.83769, 120.73655], details: { deviceNo: "Device 3", location: "Brgy. Hall Sto. Niño de Hangonoy", floodLevel: data.field3 ? data.field3 + " m" : "No data available.", warning: getFloodWarning(data.field3), forecast: smoothingData.device3 ? smoothingData.device3 + " m"  : "No data available."}},
    { position: [14.837715, 120.73695], details: { deviceNo: "Device 2", location: "Angel's Ice Cream Hangonoy", floodLevel: data.field2 ? data.field2 + " m" : "No data available.", warning: getFloodWarning(data.field2), forecast: smoothingData.device2 ? smoothingData.device2 + " m" : "No data available."}},
    { position: [14.83775, 120.73765], details: { deviceNo: "Device 1",location: "Verina Sari-Sari Store", floodLevel: data.field1 ? data.field1 + " m" : "No data available.", warning: getFloodWarning(data.field1), forecast: smoothingData.device1 ? smoothingData.device1 + " m" : "No data available."}}
  ];  

  // Define paths dynamically based on flood levels
  const paths = [
    { positions: [[14.8374, 120.73515],[14.83753, 120.7355], [14.83761, 120.73575], [14.837635, 120.7359]], color: getPathColor(data.field4), weight: 17 },
    { positions: [[14.837635, 120.7359], [14.83765, 120.7360], [14.83766, 120.73611], [14.83766, 120.7361], [14.8377, 120.73655], [14.83771, 120.7367012]], color: getPathColor(data.field3), weight: 17 },
    { positions: [[14.83771, 120.7367], [14.837715, 120.7370], [14.837725, 120.7372005]], color: getPathColor(data.field2), weight: 17 },
    { positions: [[14.837725, 120.7372], [14.83775, 120.7375], [14.83779, 120.73778]], color: getPathColor(data.field1), weight: 17 }
  ];

   // Function to fetch data from the Flask API
   // Function to fetch data from the Flask API
  const fetchData = () => {
    fetch("http://127.0.0.1:5000/get_latest")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((feeds) => {
        if (feeds && feeds.length > 0) {
          // Assuming feeds is an array of values for field1, field2, field3, field4
          setdata({
            field1: feeds[0],
            field2: feeds[1],
            field3: feeds[2],
            field4: feeds[3],
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);  // Log any error that occurs
      });
  };


    const fetchSmoothData = () => {
      fetch("http://127.0.0.1:5000/get_smoothing_data")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then((feeds) => {
          if (feeds) {
            setSmoothingData({
              device1: feeds.device1,
              device2: feeds.device2,
              device3: feeds.device3,
              device4: feeds.device4
            });
          }
        })        
        .catch((error) => {
          console.error("Error fetching data:", error);  // Log any error that occurs
        });
    };    

    // Using useEffect for initial data fetch and setting up the interval
    useEffect(() => {
      fetchData(); // Fetch data on component mount
      fetchSmoothData();
  
      const interval = setInterval(() => {
        fetchData(); // Fetch data every 5 minutes (300,000 ms)
        fetchSmoothData();
      }, 300000);
  
      // Cleanup interval on component unmount
      return () => clearInterval(interval);
    }, []);  // Empty dependency array means this runs once on component mount

    // Loading check for both data and smoothingData
    if (!data || !data.field1 || !data.field2 || !data.field2 || !data.field3 || !data.field4 ) {
      return <div>Loading...</div>; // Display loading indicator while data is being fetched
    }

  return (
    <div className="map-container">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          minZoom={initialZoom}
          maxZoom={initialZoom}
          zoomControl={false}
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
          lineCap="butt"   // Boxy ends
          lineJoin="miter" // Boxy corners
        />
      ))}
      </MapContainer>
      <div className='sidemenu'>
        <h3 style={{marginTop: 0}}>Legend</h3>
        <div className='legend-item' style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div className='legend-color' style={{ backgroundColor: colors.green, marginRight: '10px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div><b>Low Flood Level: 0 - 0.25 m</b></div>
            <div>PATV (Passable to All Types of Vehicles)</div>
          </div>
        </div>
        <div className='legend-item' style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div className='legend-color' style={{ backgroundColor: colors.yellow, marginRight: '10px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div><b>Medium Flood Level: 0.25 - 0.50 m</b></div>
          <div>NPLV (Not Passable to Light Vehicles)</div>
          </div>
        </div>
        <div className='legend-item' style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div className='legend-color' style={{ backgroundColor: colors.red, marginRight: '10px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div><b>High Flood Level: &gt; 0.50 m</b></div>
          <div>NPATV (Not Passable to All Types of Vehicles)</div>
        </div>
        </div>
      </div>
      {selectedPopup && (
        <div className='popup-card'>
          <button className='close-btn' onClick={() => setSelectedPopup(null)}>×</button>
          <h3 style={{marginTop: '3px'}}>Flood Information</h3>
          <p><strong>Device Number:</strong> {selectedPopup.deviceNo}</p>
          <p><strong>Location:</strong> {selectedPopup.location}</p>
          <p><strong>Current Flood Level:</strong> {selectedPopup.floodLevel}</p>
          <p><strong>Warning Message:</strong> {selectedPopup.warning}</p>
          <p><strong>Forecast Flood Level:</strong> {selectedPopup.forecast}</p>
        </div>
      )}
    </div>
  );
}

export default App;