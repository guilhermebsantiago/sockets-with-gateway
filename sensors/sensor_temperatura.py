import socket
import struct
import threading
import time
import random
import iot_pb2 as proto

# Configurações Específicas
MEU_ID = "sensor_temperatura_01"
MINHA_PORTA_TCP = 8006 # Porta TCP é necessária apenas para REGISTRO (opcional)
GATEWAY_UDP_PORT = 9001
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

class SensorTemperatura:
    def __init__(self):
        # Temperatura inicial em Celsius
        self.temperatura_atual = 25.0 

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "SENSOR" # Dispositivo que apenas envia dados
        
        print(f"🌡️ [TEMP] Anunciando presença via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def enviar_leitura(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        while True:
            # Envia a cada 15 segundos (Exemplo do requisito [cite: 67])
            time.sleep(15) 
            
            # Simula uma variação de temperatura
            variacao = random.uniform(-0.5, 0.5)
            self.temperatura_atual += variacao
            
            msg = proto.Mensagem()
            msg.id_origem = MEU_ID
            msg.tipo_mensagem = "DADOS"
            msg.dados.valor = self.temperatura_atual
            msg.dados.unidade = "°C"
            msg.dados.tipo_leitura = "TEMPERATURA"
            
            print(f"🌡️ [ENVIO] Leitura de Temperatura: {self.temperatura_atual:.2f} °C")
            # Envio para o Gateway via UDP
            sock.sendto(msg.SerializeToString(), ('localhost', GATEWAY_UDP_PORT))

    def start(self):
        threading.Thread(target=self.enviar_leitura).start()
        time.sleep(1)
        self.anunciar_presenca()

if __name__ == "__main__":
    SensorTemperatura().start()