import socket
import struct
import threading
import time
import random
import signal
import sys
import iot_pb2 as proto
import config

MEU_ID = "sensor_temperatura_01"
MINHA_PORTA_TCP = config.SENSOR_TEMPERATURA_PORT
GATEWAY_UDP_PORT = config.GATEWAY_UDP_PORT
MCAST_GRP = config.MCAST_GRP
MCAST_PORT = config.MCAST_PORT

running = True

def enviar_desregistro():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "DESREGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "SENSOR"
        
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))
        sock.close()
    except:
        pass

def signal_handler(sig, frame):
    global running
    print("\n[TEMP] Encerrando...")
    running = False
    enviar_desregistro()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class SensorTemperatura:
    def __init__(self):
        self.temperatura_atual = 25.0 

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "SENSOR"
        
        print(f"[TEMP] Anunciando presenca via Multicast (porta {MINHA_PORTA_TCP})...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))
        sock.close()

    def ouvir_discovery(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('', MCAST_PORT))
        sock.settimeout(1.0)
        
        mreq = struct.pack("4sl", socket.inet_aton(MCAST_GRP), socket.INADDR_ANY)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        
        while running:
            try:
                data, addr = sock.recvfrom(1024)
                try:
                    msg = proto.Mensagem()
                    msg.ParseFromString(data)
                    if msg.tipo_mensagem == "DISCOVERY":
                        print(f"[TEMP] Recebido pedido de descoberta do Gateway")
                        time.sleep(0.7)
                        self.anunciar_presenca()
                except:
                    pass
            except socket.timeout:
                continue
            except:
                break

    def enviar_leitura(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        while running:
            time.sleep(15)
            if not running:
                break
            
            variacao = random.uniform(-0.5, 0.5)
            self.temperatura_atual += variacao
            
            msg = proto.Mensagem()
            msg.id_origem = MEU_ID
            msg.tipo_mensagem = "DADOS"
            msg.dados.valor = self.temperatura_atual
            msg.dados.unidade = "C"
            msg.dados.tipo_leitura = "TEMPERATURA"
            
            print(f"[ENVIO] Leitura de Temperatura: {self.temperatura_atual:.2f} C")
            sock.sendto(msg.SerializeToString(), ('localhost', GATEWAY_UDP_PORT))

    def start(self):
        threading.Thread(target=self.enviar_leitura, daemon=True).start()
        threading.Thread(target=self.ouvir_discovery, daemon=True).start()
        
        time.sleep(1)
        self.anunciar_presenca()
        
        try:
            while running:
                time.sleep(0.5)
        except KeyboardInterrupt:
            pass
        finally:
            enviar_desregistro()

if __name__ == "__main__":
    print("[TEMP] Iniciando... (Ctrl+C para encerrar)")
    SensorTemperatura().start()
