import socket
import struct
import threading
import time
import signal
import sys
import iot_pb2 as proto
import config

MEU_ID = "poste_avenida"
MINHA_PORTA_TCP = config.POSTE_PORT
MCAST_GRP = config.MCAST_GRP
MCAST_PORT = config.MCAST_PORT

running = True

def enviar_desregistro():
    """Envia mensagem de DESREGISTRO ao encerrar"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "DESREGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "ATUADOR"
        
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))
        sock.close()
    except:
        pass

def signal_handler(sig, frame):
    global running
    print("\n[POSTE] Encerrando...")
    running = False
    enviar_desregistro()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class Poste:
    def __init__(self):
        self.intensidade = 100

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "ATUADOR"
        
        print(f"[POSTE] Anunciando presenca via Multicast (porta {MINHA_PORTA_TCP})...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def ouvir_comandos(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        server.listen(5)
        server.settimeout(1.0)
        print(f"[POSTE] Aguardando comandos na porta {MINHA_PORTA_TCP}")

        while running:
            try:
                client, _ = server.accept()
                try:
                    data = client.recv(1024)
                    msg = proto.Mensagem()
                    msg.ParseFromString(data)
                    if msg.tipo_mensagem == "COMANDO":
                        self.intensidade = int(msg.comando.param.replace('%',''))
                        print(f"[ACAO] Intensidade ajustada para: {self.intensidade}%")
                except: pass
                client.close()
            except socket.timeout:
                continue
            except:
                break

    def start(self):
        t = threading.Thread(target=self.ouvir_comandos, daemon=True)
        t.start()
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
    print("[POSTE] Iniciando... (Ctrl+C para encerrar)")
    Poste().start()
