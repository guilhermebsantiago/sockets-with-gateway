import socket
import struct
import threading
import time
import random
import signal
import sys
import iot_pb2 as proto

MEU_ID = "sensor_qualidade_ar_01"
MINHA_PORTA_TCP = 8007
GATEWAY_UDP_PORT = 9001
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

running = True

def signal_handler(sig, frame):
    global running
    print("\n[AQI] Encerrando...")
    running = False
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class SensorQualidadeAr:
    def __init__(self):
        self.aqi_atual = 50 

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "SENSOR"
        
        print(f"[AQI] Anunciando presenca via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def enviar_leitura(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        while running:
            time.sleep(20)
            if not running:
                break
            
            variacao = random.randint(-5, 5)
            self.aqi_atual = max(0, min(150, self.aqi_atual + variacao))
            
            msg = proto.Mensagem()
            msg.id_origem = MEU_ID
            msg.tipo_mensagem = "DADOS"
            msg.dados.valor = self.aqi_atual
            msg.dados.unidade = "AQI"
            msg.dados.tipo_leitura = "QUALIDADE_AR"
            
            print(f"[ENVIO] Indice de Qualidade do Ar (AQI): {self.aqi_atual}")
            sock.sendto(msg.SerializeToString(), ('localhost', GATEWAY_UDP_PORT))

    def start(self):
        threading.Thread(target=self.enviar_leitura, daemon=True).start()
        time.sleep(1)
        self.anunciar_presenca()
        
        try:
            while running:
                time.sleep(0.5)
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    print("[AQI] Iniciando... (Ctrl+C para encerrar)")
    SensorQualidadeAr().start()
