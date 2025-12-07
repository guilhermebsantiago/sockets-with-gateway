import socket
import struct
import threading
import time
import random
import iot_pb2 as proto

MEU_ID = "radar_velocidade_01"
MINHA_PORTA_TCP = 8003
GATEWAY_UDP_PORT = 9001
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

class Radar:
    def __init__(self):
        self.resolucao = "720p"

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "MISTO" # Sensor + Atuador
        
        print(f"📷 [RADAR] Anunciando presença via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def ouvir_configuracao(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        server.listen(5)
        
        while True:
            client, _ = server.accept()
            try:
                data = client.recv(1024)
                msg = proto.Mensagem()
                msg.ParseFromString(data)
                if msg.tipo_mensagem == "COMANDO" and msg.comando.acao == "SET_RESOLUCAO":
                    self.resolucao = msg.comando.param
                    print(f"📷 [CONFIG] Resolução alterada para: {self.resolucao}")
            except: pass
            client.close()

    def enviar_velocidade(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        while True:
            time.sleep(4) # Envia a cada 4 segundos
            velocidade = random.uniform(40.0, 110.0)
            
            msg = proto.Mensagem()
            msg.id_origem = MEU_ID
            msg.tipo_mensagem = "DADOS"
            msg.dados.valor = velocidade
            msg.dados.unidade = "km/h"
            msg.dados.tipo_leitura = "VELOCIDADE"
            
            print(f"📷 [ENVIO] Carro detectado: {velocidade:.1f} km/h")
            sock.sendto(msg.SerializeToString(), ('localhost', GATEWAY_UDP_PORT))

    def start(self):
        threading.Thread(target=self.ouvir_configuracao).start()
        threading.Thread(target=self.enviar_velocidade).start()
        time.sleep(1)
        self.anunciar_presenca()

if __name__ == "__main__":
    Radar().start()