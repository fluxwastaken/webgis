from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

THINGSPEAK_API_KEY = '1GY3ELI7PBHDLJV2' 
THINGSPEAK_URL = 'https://api.thingspeak.com/update'

#default route (not important)
@app.route('/')
def home():
    return jsonify({"message": "Welcome to Flask and ThingSpeak API"})

#API endpoint for sending data to thingspeak database
@app.route('/send_data', methods=['POST'])
def send_data():
    data = request.get_json()  # Get JSON data sent in the POST request
    field1_value = data.get('field1', 0)  # Get value for field1

    #specify the parameters
    params = {
        'api_key': THINGSPEAK_API_KEY,
        'field1': field1_value
    }

    #send the request to the api
    response = requests.get(THINGSPEAK_URL, params=params)
    if response.status_code == 200:
        return jsonify({"message": "Data sent successfully"}), 200
    else:
        return jsonify({"message": "Failed to send data"}), 500

if __name__ == '__main__':
    app.run(debug=True)