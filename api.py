from flask import Flask, jsonify, request
import requests
from flask_cors import CORS
import pandas as pd
import numpy as np
from statsmodels.tsa.api import SimpleExpSmoothing
import csv
import matplotlib.pyplot as plt
from statsmodels.tsa.holtwinters import SimpleExpSmoothing
from sklearn.metrics import mean_squared_error, mean_absolute_error
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from tabulate import tabulate

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
    # print(response.json())
    
    if response.status_code == 200:
        data = response.json()["feeds"]

        # Filter data: Only keep entries with entry_id >= 70 and exclude 5715 & 5716
        filtered_data = [entry for entry in data if int(entry["entry_id"]) >= 70 and int(entry["entry_id"]) not in (5715, 5716)]

        if filtered_data:
            # Reset entry_id to start from 1
            for i, entry in enumerate(filtered_data, start=1):
                entry["entry_id"] = i  # Replace the original entry_id with new index

            # Save to CSV file
            with open("Data.csv", mode="w", newline="", encoding="utf-8") as file:
                writer = csv.writer(file)

                # Writing header
                writer.writerow(filtered_data[0].keys())

                # Writing data
                for entry in filtered_data:
                    writer.writerow(entry.values())

        return response.json()["feeds"], 200
    else:
        return jsonify({"message": "Failed to get data"}), 500
    
@app.route('/forecast_data', methods=['GET'])
def dfclean():
    df = pd.read_csv("Data.csv")
    df = df[df["entry_id"] < 5183]
    #Removing Unnecessary Columns and Integrating Fields with data
    df['field2'] = pd.to_numeric(df['field2'], errors='coerce').fillna(0)
    df['field3'] = pd.to_numeric(df['field3'], errors='coerce').fillna(0)
    df['combined_field'] = df['field2'] + df['field3'].round(2)

    df = df[['created_at','entry_id','combined_field']]

    #Set Negative values to 0
    df['combined_field'] = df['combined_field'].apply(lambda x: 0 if x < 0 else x)
    
    # Apply the function to identify outliers
    outliers = mad_based_outlier(df['combined_field'].values)

    # Remove outliers
    df_filtered = df[~outliers]

    # Calculate quartiles and max value
    quartiles = df_filtered['combined_field'].quantile([0.25, 0.5, 0.75])
    max_value = df_filtered['combined_field'].max()

    print("Quartiles:")
    print(quartiles)
    print("Maximum Value:", max_value)

    # Convert 'created_at' to datetime objects if it's not already
    df_filtered['created_at'] = pd.to_datetime(df_filtered['created_at'])

    # Set 'entry_id' as the index
    df_filtered = df_filtered.set_index('entry_id')

    # Resample the 'combined_field' column for every 10-minute interval
    df_resampled = df_filtered.resample('10T', on='created_at').mean().round(2)

    df_filtered = df_filtered.reset_index()

    df_resampled = df_filtered.set_index('created_at').rolling('10T', center=True).mean()

    # Drop NA Values
    df_resampled = df_resampled.dropna()

    # Optional: Print the resampled DataFrame
    print(df_resampled)

    # Optional: Plot the resampled data
    plt.figure(figsize=(10, 6))
    plt.plot(df_resampled['combined_field'], label='Resampled Data (Rolling Mean)')
    plt.xlabel('Date and Time')
    plt.ylabel('Combined Field Values')
    plt.title('Resampled Data with Rolling Mean')
    plt.legend()
    plt.show()
    df_resampled.to_csv('cleaned_data.csv', index=True)

    print("Cleaned data saved to 'cleaned_data.csv'")
    train_test_split_and_forecast()
    return jsonify({"message": "Forecast complete. Refer to the terminal for the details"}), 200


def mad_based_outlier(points, thresh=8):
    """
    Detects outliers using the Median Absolute Deviation (MAD).

    Args:
        points: A 1D numpy array of numbers.
        thresh: The modified Z-score to use as a threshold. Observations with
                a modified Z-score (based on the MAD) greater than this value will be
                classified as outliers.

    Returns:
        A numpy array with the same shape as points, where the values are True if
        the corresponding point in points is an outlier, False otherwise.
    """
    if len(points.shape) == 1:
        points = points[:, None]
    median = np.median(points, axis=0)
    diff = np.sum((points - median)**2, axis=-1)
    diff = np.sqrt(diff)
    mad = np.median(diff)
    modified_z_score = 0.6745 * diff / mad
    return modified_z_score > thresh


def train_test_split_and_forecast():
    # Load the cleaned data
    df = pd.read_csv("cleaned_data.csv")

    # Convert 'created_at' to datetime if it's a time series
    if 'created_at' in df.columns:
        df['created_at'] = pd.to_datetime(df['created_at'])
        df = df.set_index('created_at')

      # Split the data into training and testing sets (80% training, 20% testing)
    train_data = df[:int(0.8 * len(df))]
    test_data = df[int(0.8* len(df)):]

    # Apply Simple Exponential Smoothing for forecasting
    alpha = 0.9  # Smoothing factor (you can adjust this value)
    forecasted_values = []
    for i in range(len(test_data)):
        if i == 0:
            last_value = train_data['combined_field'].iloc[-1]
        else:
            last_value = forecasted_values[-1]

        next_forecast = alpha * test_data['combined_field'].iloc[i] + (1 - alpha) * last_value
        forecasted_values.append(next_forecast)

    # Plot the actual vs. forecasted values for the first 2000 entries
    plt.figure(figsize=(10, 6))

    # Limit the data to the first 2000 entries
    test_data_subset = test_data[:1100]  # Select the first 500 entries of test_data
    forecasted_values_subset = forecasted_values[:1100]  # Select the corresponding forecasts

    # Plot the subset of data
    plt.plot(test_data_subset.index, test_data_subset['combined_field'], label='Actual')
    plt.plot(test_data_subset.index, forecasted_values_subset, label='Forecasted')

    plt.xlabel('Date and Time')
    plt.ylabel('Combined Field Value')
    plt.title('Actual vs. Forecasted Values')
    plt.legend()
    plt.show()

    # Create a DataFrame for the actual values
    actual_df = pd.DataFrame({'Actual': test_data['combined_field'].values}, index=test_data.index)

    # Create a DataFrame for the forecasted values, using the same index as actual_df
    forecast_df = pd.DataFrame({'Forecasted': forecasted_values}, index=test_data.index)

    # Concatenate the two DataFrames to create a single table
    comparison_table = pd.concat([actual_df, forecast_df], axis=1)

    # Display the table
    print(comparison_table)


    # Evaluate the accuracy of the forecasting model
    rmse = np.sqrt(mean_squared_error(test_data['combined_field'], forecasted_values))
    mae = mean_absolute_error(test_data['combined_field'], forecasted_values)


    print(f"RMSE: {rmse}")
    print(f"MAE: {mae}")


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