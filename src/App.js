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
  const [isLoading, setIsLoading] = useState(true);

  // Initial center and zoom level
  const initialCenter = [14.8415, 120.7379];
  const initialZoom = 15.5;

  // Define color values
  const colors = {
    green: "rgba(11, 156, 49, 0.5)", 
    yellow: "rgba(225, 173, 1, 0.5)",      
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

  // Improved helper function to check if data is available and meaningful
  const isValidFloodData = (value) => {
    // Convert value to number if it’s a string, check if it's a valid number and not zero
    const numberValue = Number(value);
    return !isNaN(numberValue) && numberValue > 0;
  };

  // Define markers with conditional checks for flood data
  const markers = [
    {
      position: [14.842162, 120.735558],
      details: {
        deviceNo: "Device 2",
        location: "Capati Videoke",
        floodLevel: isValidFloodData(data?.field2) ? `${data.field2} m` : "No data available",
        warning: isValidFloodData(data?.field2) ? getFloodWarning(data.field2) : "No warning data",
        forecast: isValidFloodData(smoothingData?.device2) ? `${smoothingData.device2} m` : "No forecast data available"
      }
    },
    {
      position: [14.839167, 120.735987],
      details: {
        deviceNo: "Device 3",
        location: "Charis Store",
        floodLevel: isValidFloodData(data?.field3) ? `${data.field3} m` : "No data available",
        warning: isValidFloodData(data?.field3) ? getFloodWarning(data.field3) : "No warning data",
        forecast: isValidFloodData(smoothingData?.device3) ? `${smoothingData.device3} m` : "No forecast data available"
      }
    }
  ];

  // Define paths dynamically based on flood levels
  const paths = [
    // { positions: [[14.8485, 120.7357],[14.8468, 120.73569], [14.8460, 120.73535], [14.8451, 120.7349], [14.8446, 120.73485], [14.8435, 120.73494]], color: getPathColor(data.field1), weight: 9 },
    { positions: [[14.842401, 120.735344], [14.842162, 120.735558], [14.8412, 120.73634], [14.840827, 120.736457]], color: getPathColor(data.field2), weight: 9 },
    { positions: [[14.839292, 120.736634], [14.839178, 120.735512]], color: getPathColor(data.field3), weight: 9 },
    // { positions: [[14.8375, 120.7319], [14.8375, 120.7319], [14.836, 120.73152], [14.8355, 120.73152], [14.83441, 120.73166], [14.8336, 120.73195]], color: getPathColor(data.field4), weight: 9 }
  ];

   // Function to fetch data from the Flask API
  const fetchData = () => {
    fetch("https://webgis-production-0df7.up.railway.app/get_latest")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((feeds) => {
        console.log(feeds)
        if (feeds && feeds.length > 0) {
          // Assuming feeds is an array of values for field1, field2, field3, field4
          setdata({
            field1: (feeds[0] / 100).toFixed(4),
            field2: (feeds[1] / 100).toFixed(4),
            field3: (feeds[2] / 100).toFixed(4),
            field4: (feeds[3] / 100).toFixed(4),
          });
        } 
      })
      .catch((error) => {
        console.error("Error fetching data:", error);  // Log any error that occurs
      });
  };


    const fetchSmoothData = () => {
      fetch("https://webgis-production-0df7.up.railway.app/get_smoothing_data")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then((feeds) => {
          console.log(feeds)
          if (feeds) {
            setSmoothingData({
              device1: (feeds.device1 / 100).toFixed(4),
              device2: (feeds.device2 / 100).toFixed(4),
              device3: (feeds.device3 / 100).toFixed(4),
              device4: (feeds.device4 / 100).toFixed(4)
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
        fetchData();
        fetchSmoothData();
      }, 300000);
  
      setTimeout(() => setIsLoading(false), 1000);
  
      return () => clearInterval(interval);
    }, []);  // Empty dependency array means this runs once on component mount

    if (isLoading || !data.field2 || !data.field3 || !smoothingData.device2 || !smoothingData.device3) {
      return <div>Loading...</div>;
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
          <p><strong>10-minute Flood Forecast:</strong> {selectedPopup.forecast}</p>
        </div>
      )}
    </div>
  );
}

export default App;
