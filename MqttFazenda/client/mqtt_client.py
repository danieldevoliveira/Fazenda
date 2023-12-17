import json
import paho.mqtt.client as mqtt
import time
import mysql.connector
from datetime import datetime

# Conecta ao CounterFit
from counterfit_connection import CounterFitConnection
CounterFitConnection.init('localhost', 000)

from counterfit_shims_grove.adc import ADC
from counterfit_shims_grove.grove_relay import GroveRelay

db_config = {
    'host': '',
    'user': 'BD',
    'password': 'BD',
    'database': 'bd'
}

conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

id = '1358ee33-ac8e-4a54-ac16-36922384f71c'

client_telemetry_topic = id + '/telemetry'
server_command_topic = id + '/commands'
client_name = id + 'fazenda'

mqtt_client = mqtt.Client(client_name)
mqtt_client.connect('test.mosquitto.org')
mqtt_client.loop_start()

def handle_command(client, userdata, message):
    payload = json.loads(message.payload.decode())
    print("Message received:", payload)

mqtt_client.subscribe(server_command_topic)
mqtt_client.on_message = handle_command

adc = ADC()
relay = GroveRelay(5)

while True:
    try:
        temperaturaA = CounterFitConnection.get_sensor_float_value(0)  
        temperaturaB = CounterFitConnection.get_sensor_float_value(1)  
        temperaturaC = CounterFitConnection.get_sensor_float_value(2)  

        soil_moisture = adc.read(3)
        print("Soil moisture:", soil_moisture)
        
        formatted_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
 

        if soil_moisture > 450:
            print("A umidade do solo está muito baixa, ligando o relé")
            relay.on()
        else:
            print("A umidade do solo está ok, desligando o relé.")
            relay.off()

        print('Temperatura A:', temperaturaA) 
        print('Temperatura B:', temperaturaB)
        print('Temperatura C:', temperaturaC)
        print('-------------------------------------------------------------------------------')

        # Estrutura os dados em um formato JSON e publica no tópico
        mqtt_client.publish(client_telemetry_topic, json.dumps({'temperatura A ': temperaturaA}))
        mqtt_client.publish(client_telemetry_topic, json.dumps({'temperatura B ': temperaturaB}))
        mqtt_client.publish(client_telemetry_topic, json.dumps({'temperatura C ': temperaturaC}))
        
        # Inserindo dados na tabela
        insert_query = f"INSERT INTO temperatura (data_hora, temperatura, regiao_id) VALUES ('{formatted_date}', %s, %s)"
        
        insert_data = (temperaturaA, 1)
        cursor.execute(insert_query, insert_data)
        conn.commit()
        
        insert_data = (temperaturaB, 2)
        cursor.execute(insert_query, insert_data)
        conn.commit()
        
        insert_data = (temperaturaC, 3)
        cursor.execute(insert_query, insert_data)
        conn.commit()
        
    except ValueError as e:
        print('Error getting sensor value:', str(e))

    time.sleep(5)

cursor.close()
conn.close()
