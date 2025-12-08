import socket
import struct
import threading
import time
import random
import signal
import sys
import iot_pb2 as proto

MEU_ID = "radar_velocidade_01"
MINHA_PORTA_TCP = 8003
GATEWAY_UDP_PORT = 9001
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

running = True

def signal_handler(sig, frame):
    global running
    print("\n[RADAR] Encerrando...")
    running = False
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

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
        msg.registro.tipo_dispositivo = "MISTO"
        
        print(f"[RADAR] Anunciando presenca via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def ouvir_configuracao(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        server.listen(5)
        server.settimeout(1.0)
        
        while running:
            try:
                client, _ = server.accept()
                try:
                    data = client.recv(1024)
                    msg = proto.Mensagem()
                    msg.ParseFromString(data)
                    if msg.tipo_mensagem == "COMANDO" and msg.comando.acao == "SET_RESOLUCAO":
                        self.resolucao = msg.comando.param
                        print(f"[CONFIG] Resolucao alterada para: {self.resolucao}")
                except: pass
                client.close()
            except socket.timeout:
                continue
            except:
                break

    def enviar_velocidade(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        while running:
            time.sleep(4)
            if not running:
                break
            velocidade = random.uniform(40.0, 110.0)
            
            msg = proto.Mensagem()
            msg.id_origem = MEU_ID
            msg.tipo_mensagem = "DADOS"
            msg.dados.valor = velocidade
            msg.dados.unidade = "km/h"
            msg.dados.tipo_leitura = "VELOCIDADE"
            
            print(f"[ENVIO] Carro detectado: {velocidade:.1f} km/h")
            sock.sendto(msg.SerializeToString(), ('localhost', GATEWAY_UDP_PORT))

    def start(self):
        threading.Thread(target=self.ouvir_configuracao, daemon=True).start()
        threading.Thread(target=self.enviar_velocidade, daemon=True).start()
        time.sleep(1)
        self.anunciar_presenca()
        
        try:
            while running:
                time.sleep(0.5)
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    print("[RADAR] Iniciando... (Ctrl+C para encerrar)")
    Radar().start()
