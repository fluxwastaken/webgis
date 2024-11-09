from flask import Flask, jsonify, request
import requests
from flask_cors import CORS
import pandas as pd
import numpy as np
from statsmodels.tsa.api import SimpleExpSmoothing

app = Flask(__name__)
CORS(app)
#default route (not important)
@app.route('/')
def home():
    return jsonify({"message": "Welcome to Flask and ThingSpeak API"})

THINGSPEAK_WRITE_API_KEY = 'KUGDW9RA34EWPLQV' 
THINGSPEAK_WRITE_URL = 'https://api.thingspeak.com/update'

#API endpoint for sending data to thingspeak database
@app.route('/send_data', methods=['POST'])
def send_data():
    data = request.get_json()  # Get JSON data sent in the POST request
    field1_value = data.get('field1', 10)  # Assign value for field1

    #specify the parameters
    params = {
        'api_key': THINGSPEAK_WRITE_API_KEY,
        'field1': field1_value
    }

    #send the request to the api
    response = requests.get(THINGSPEAK_WRITE_URL, params=params)
    if response.status_code == 200:
        return jsonify({"message": "Data sent successfully"}), 200
    else:
        return jsonify({"message": "Failed to send data"}), 500

THINGSPEAK_READ_API_KEY = 'A46JROYTYFVY6JQE' 
THINGSPEAK_READ_URL = 'https://api.thingspeak.com/channels/2683477/feeds.json'

#API endpoint for getting data from thingspeak database
@app.route('/get_data', methods=['GET'])
def get_data():

    params = {
        'api_key': THINGSPEAK_READ_API_KEY,
        'results': 8000
    }

    response = requests.get(THINGSPEAK_READ_URL, params=params)
    print(response.json())
    
    if response.status_code == 200:
        return response.json()["feeds"], 200
    else:
        return jsonify({"message": "Failed to get data"}), 500

#API endpoint for getting the smoothing data 
@app.route('/get_smoothing_data', methods=['GET'])
def get_smoothing_data():

    params = {
        'api_key': THINGSPEAK_READ_API_KEY,
        'results': 8000
    }

    response = requests.get(THINGSPEAK_READ_URL, params=params)
    print(response.json())
    distances_field1 = []
    distances_field2 = []
    distances_field3 = []
    distances_field4 = []

    for entry in response.json()["feeds"]:
        print(entry)  # For debugging
        # Ensure 'field1' exists and is not None
        if entry["field1"]:
        # Append the float value of 'field1' to the distances_field1 list
            distances_field1.append(float(entry["field1"]))
        if entry["field2"]:
        # Append the float value of 'field2' to the distances_field2 list
            distances_field2.append(float(entry["field2"]))
        if entry["field3"]:
        # Append the float value of 'field3' to the distances_field3 list
            distances_field3.append(float(entry["field3"]))
        if entry["field4"]:
        # Append the float value of 'field4' to the distances_field4 list
            distances_field4.append(float(entry["field4"]))

    #For checking if all were appended
    print(distances_field1)
    print(distances_field2)
    print(distances_field3)
    print(distances_field4)
    
    forecast_list = {
        'device1': 0,
        'device2': 0,
        'device3': 0,
        'device4': 0,
    }
    if len(distances_field1) > 0:
        forecast_list = perform_smoothing("device1", distances_field1, forecast_list)
    if len(distances_field2) > 0:
        forecast_list = perform_smoothing("device2", distances_field2, forecast_list)
    if len(distances_field3) > 0:
        forecast_list = perform_smoothing("device3", distances_field3, forecast_list)
    if len(distances_field4) > 0:
        forecast_list = perform_smoothing("device4", distances_field4, forecast_list)

    if response.status_code == 200:
        return forecast_list, 200
    else:
        return jsonify({"message": "Failed to get data"}), 500
def perform_smoothing(device, distances,forecast_list):
        # Convert flood levels to a pandas Series (with hourly frequency)
        flood_series = pd.Series(distances)

        # Fit the Simple Exponential Smoothing model    
        model = SimpleExpSmoothing(flood_series).fit(smoothing_level=0.9, optimized=False)
        # Forecast the next level ahead
        forecast = model.forecast(1)

        # Display the forecast (this is a time series data)
        print(forecast) #prints -> __index__ ,  __value__
        # Display only the numerical value
        print(forecast.iloc[0])
        forecast_list[f"{device}"] = round(forecast.iloc[0],2)

        return forecast_list

def get_latest_per_device(sorted_entries):
    latest_entries = {
        'field1': None,
        'field2': None,
        'field3': None,
        'field4': None
    }
    
    # Loop through each entry in the sorted list
    for entry in sorted_entries:
        # Check each field and store the first occurrence
        for field in latest_entries:
            if latest_entries[field] is None and entry[field] is not None:
                latest_entries[field] = entry[field]
        
        # If we already found the latest entries for all fields, break the loop
        if all(latest_entries.values()):
            break
    print(latest_entries)
    # Return the latest entries as a list
    return [latest_entries[field] for field in latest_entries]


@app.route('/get_latest', methods=['GET'])
def get_latest():
     # Dictionary to store the latest entry for each device
    latest_entries = {
        'field1': None,
        'field2': None,
        'field3': None,
        'field4': None
    }
    params = {
        'api_key': THINGSPEAK_READ_API_KEY,
        'results': 8000
    }

    response = requests.get(THINGSPEAK_READ_URL, params=params)
    feeds = response.json()["feeds"]
    
    # Sort feeds based on "entry_id" in descending order
    sorted_list = sorted(feeds, key=lambda x: x["entry_id"], reverse=True)

    latest_entries =  get_latest_per_device(sorted_list)
    print(latest_entries)
    return latest_entries,200

if __name__ == '__main__':
    app.run(debug=True)