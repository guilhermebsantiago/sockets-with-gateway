import socket
import struct
import threading
import time
import random
import iot_pb2 as proto

# Configurações Específicas
MEU_ID = "sensor_qualidade_ar_01"
MINHA_PORTA_TCP = 8007 # Porta TCP é necessária apenas para REGISTRO (opcional)
GATEWAY_UDP_PORT = 9001
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

class SensorQualidadeAr:
    def __init__(self):
        # Simula o Índice de Qualidade do Ar (AQI) - 0 a 50 (Bom), 51 a 100 (Moderado), etc.
        self.aqi_atual = 50 

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "SENSOR"
        
        print(f"☁️ [AQI] Anunciando presença via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def enviar_leitura(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        while True:
            time.sleep(20) # Envia a cada 20 segundos
            
            # Simula uma variação no AQI
            variacao = random.randint(-5, 5)
            self.aqi_atual = max(0, min(150, self.aqi_atual + variacao)) # Limita entre 0 e 150
            
            msg = proto.Mensagem()
            msg.id_origem = MEU_ID
            msg.tipo_mensagem = "DADOS"
            msg.dados.valor = self.aqi_atual
            msg.dados.unidade = "AQI"
            msg.dados.tipo_leitura = "QUALIDADE_AR"
            
            print(f"☁️ [ENVIO] Índice de Qualidade do Ar (AQI): {self.aqi_atual}")
            # Envio para o Gateway via UDP
            sock.sendto(msg.SerializeToString(), ('localhost', GATEWAY_UDP_PORT))

    def start(self):
        threading.Thread(target=self.enviar_leitura).start()
        time.sleep(1)
        self.anunciar_presenca()

if __name__ == "__main__":
    SensorQualidadeAr().start()