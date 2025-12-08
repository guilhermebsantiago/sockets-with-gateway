import os

# Configuracoes de rede
MCAST_GRP = os.getenv('MCAST_GRP', '224.1.1.1')
MCAST_PORT = int(os.getenv('MCAST_PORT', '5007'))
GATEWAY_UDP_PORT = int(os.getenv('GATEWAY_UDP_PORT', '9001'))

# Portas TCP dos dispositivos
SEMAFORO_PORT = int(os.getenv('SEMAFORO_PORT', '8001'))
POSTE_PORT = int(os.getenv('POSTE_PORT', '8002'))
RADAR_PORT = int(os.getenv('RADAR_PORT', '8003'))
CAMERA_ESTACIONAMENTO_PORT = int(os.getenv('CAMERA_ESTACIONAMENTO_PORT', '8004'))
CAMERA_PRACA_PORT = int(os.getenv('CAMERA_PRACA_PORT', '8005'))
SENSOR_TEMPERATURA_PORT = int(os.getenv('SENSOR_TEMPERATURA_PORT', '8006'))
SENSOR_AR_PORT = int(os.getenv('SENSOR_AR_PORT', '8007'))


