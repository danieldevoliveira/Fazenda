import json
import time
import paho.mqtt.client as mqtt

id = '1358ee33-ac8e-4a54-ac16-36922384f71c'
client_telemetry_topic = id + '/telemetry'
client_name = id + '_fazenda'  # Corrigido o nome do cliente
mqtt_client = mqtt.Client(client_name)
mqtt_client.connect('test.mosquitto.org')
mqtt_client.loop_start()

def handle_telemetry(client, userdata, message):
    try:
        payload = json.loads(message.payload.decode())
        print('Message received: ', payload)
    except json.JSONDecodeError as e:
        print('Error decoding JSON:', str(e))

mqtt_client.subscribe(client_telemetry_topic)
mqtt_client.on_message = handle_telemetry

while True:
    time.sleep(2)
