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
  const initialCenter = [14.8378, 120.7395];
  const initialZoom = 17;

  // const handleRecenter = () => {
  //   const map = mapRef.current;
  //   if (map) {
  //     map.setView(initialCenter, initialZoom); // Recenter the map
  //   }
  // };

  // Define color values
  const colors = {
    yellow: "rgba(242, 186, 73, 0.5)", 
    orange: "rgba(252, 76, 2, 0.5)",      
    red: "rgba(180, 0, 50, 0.5)"            
  };
  
  // Define the warning levels for flood levels
  const legendItems = {
    yellowWarning: "Monitor the weather condition.", 
    orangeWarning: "Be ready for possible evacuation.",  
    redWarning: "All residents should evacuate." 
  };
  
  // Function to determine the appropriate warning based on flood level
  const getFloodWarning = (floodLevel) => {
    const level = parseFloat(floodLevel); // Convert string to float
    if (isNaN(level)) {
      return "No data available";  // If not a valid number, return a default message
    } else if (level <= 0.25) {
      return legendItems.yellowWarning;
    } else if (level <= 0.50) {
      return legendItems.orangeWarning;
    } else {
      return legendItems.redWarning;
    }
  };

  // Function to determine the path color based on flood level
  const getPathColor = (floodLevel) => {
    const level = parseFloat(floodLevel);
    if (isNaN(level)) {
      return "000000";  // Default to transparent if no valid data
    } else if (level <= 0.25) {
      return colors.yellow;
    } else if (level <= 0.50) {
      return colors.orange;
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
    { position: [14.8375, 120.7355], details: { deviceNo: "Device 4", location: "Iglesia ni Kristo: Lokal ng Hangonoy", floodLevel: data.field4 + " m" || "No data available.", warning: getFloodWarning(data.field4), forecast: smoothingData.device4 + " m" || "No data available."}},
    { position: [14.8377, 120.73655], details: { deviceNo: "Device 3", location: "Brgy. Hall Sto. Niño de Hangonoy", floodLevel: data.field3 + " m" || "No data available.", warning: getFloodWarning(data.field3), forecast: smoothingData.device3 + " m"  || "No data available."}},
    { position: [14.83778, 120.7378], details: { deviceNo: "Device 2", location: "Angel's Ice Cream Hangonoy", floodLevel: data.field2 + " m" || "No data available.", warning: getFloodWarning(data.field2), forecast: smoothingData.device2 + " m" || "No data available."}},
    { position: [14.8386, 120.7395], details: { deviceNo: "Device 1",location: "Sto. Niño Main Road", floodLevel: data.field1 + " m" || "No data available.", warning: getFloodWarning(data.field1), forecast: smoothingData.device1 + " m" || "No data available."}}
  ];  

  // Define paths dynamically based on flood levels
  const paths = [
    { positions: [[14.83753, 120.7355], [14.8376, 120.73575], [14.83765, 120.7360], [14.83769, 120.7364], [14.8377, 120.73655]], color: getPathColor(data.field4), weight: 17 },
    { positions: [[14.8377, 120.73655], [14.837715, 120.7370], [14.83775, 120.7375], [14.83778, 120.7378]], color: getPathColor(data.field3), weight: 17 },
    { positions: [[14.83778, 120.7378], [14.83793, 120.73825], [14.83826, 120.738955], [14.83824, 120.7389], [14.83866, 120.7395]], color: getPathColor(data.field2), weight: 17 },
    { positions: [[14.83866, 120.7395], [14.8400, 120.7415]], color: getPathColor(data.field1), weight: 17 }
  ];

   // Function to fetch data from the Flask API
   const fetchData = () => {
    fetch("http://127.0.0.1:5000/get_data")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((feeds) => {
        if (feeds && feeds.length > 0) {
          const latestFeed = feeds.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          setdata({
            created_at: latestFeed.created_at,
            entry_id: latestFeed.entry_id,
            field1: latestFeed.field1,
            field2: latestFeed.field2,
            field3: latestFeed.field3,
            field4: latestFeed.field4
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
    if (!data || !data.field1 ) {
      return <div>Loading...</div>; // Display loading indicator while data is being fetched
    }

  return (
    <div className="map-container">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          minZoom={initialZoom}
          maxZoom={initialZoom}
          zoomControl={false} // Disable zoom controls
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
          <div>Medium Flood Level: 0.25 - 0.50 m</div>
        </div>
        <div className='legend-item'>
          <div className='legend-color' style={{ backgroundColor: colors.red }}></div>
          <div>High Flood Level: &gt; 0.50 m</div>
        </div>
      </div>
      {/* <button className="recenter-button" onClick={handleRecenter}>
        Recenter Map
      </button> */}
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