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

THINGSPEAK_WRITE_API_KEY = '1GY3ELI7PBHDLJV2' 
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

THINGSPEAK_READ_API_KEY = 'YUIFQ3ZB7FIB1704' 
THINGSPEAK_READ_URL = 'https://api.thingspeak.com/channels/2650707/feeds.json'

#API endpoint for getting data from thingspeak database
@app.route('/get_data', methods=['GET'])
def get_data():

    params = {
        'api_key': THINGSPEAK_READ_API_KEY
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
        'api_key': THINGSPEAK_READ_API_KEY
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
            distances_field1.append(round(float(entry["field1"]), 2))
        if entry["field2"]:
        # Append the float value of 'field2' to the distances_field2 list
            distances_field2.append(round(float(entry["field1"]), 2))
        if entry["field3"]:
        # Append the float value of 'field3' to the distances_field3 list
            distances_field3.append(round(float(entry["field1"]), 2))
        if entry["field4"]:
        # Append the float value of 'field4' to the distances_field4 list
            distances_field4.append(round(float(entry["field1"]), 2))

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

if __name__ == '__main__':
    app.run(debug=True)