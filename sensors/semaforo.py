import socket
import struct
import threading
import time
import signal
import sys
import iot_pb2 as proto
import config

MEU_ID = "semaforo_principal"
MINHA_PORTA_TCP = config.SEMAFORO_PORT
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
    print("\n[SEMAFORO] Encerrando...")
    running = False
    enviar_desregistro()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class Semaforo:
    def __init__(self):
        self.cor_atual = "VERMELHO"
        self.server = None

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "ATUADOR"
        
        print(f"[SEMAFORO] Anunciando presenca via Multicast (porta {MINHA_PORTA_TCP})...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))
        sock.close()

    def ouvir_discovery(self):
        """Escuta mensagens de DISCOVERY do Gateway e re-anuncia"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('', MCAST_PORT))
        sock.settimeout(1.0)
        
        # Entra no grupo Multicast
        mreq = struct.pack("4sl", socket.inet_aton(MCAST_GRP), socket.INADDR_ANY)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        
        while running:
            try:
                data, addr = sock.recvfrom(1024)
                try:
                    msg = proto.Mensagem()
                    msg.ParseFromString(data)
                    if msg.tipo_mensagem == "DISCOVERY":
                        print(f"[SEMAFORO] Recebido pedido de descoberta do Gateway")
                        time.sleep(0.1)  # Pequeno delay para evitar colisao
                        self.anunciar_presenca()
                except:
                    pass
            except socket.timeout:
                continue
            except:
                break

    def ouvir_comandos(self):
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        self.server.listen(5)
        self.server.settimeout(1.0)
        print(f"[SEMAFORO] Aguardando comandos na porta {MINHA_PORTA_TCP}")

        while running:
            try:
                client, _ = self.server.accept()
                try:
                    data = client.recv(1024)
                    msg = proto.Mensagem()
                    msg.ParseFromString(data)
                    
                    if msg.tipo_mensagem == "COMANDO":
                        nova_cor = msg.comando.param
                        self.cor_atual = nova_cor
                        print(f"[ACAO] Mudando luz para: {self.cor_atual}")
                except: pass
                client.close()
            except socket.timeout:
                continue
            except:
                break

    def start(self):
        # Thread para ouvir comandos TCP
        t1 = threading.Thread(target=self.ouvir_comandos, daemon=True)
        t1.start()
        
        # Thread para ouvir DISCOVERY do Gateway
        t2 = threading.Thread(target=self.ouvir_discovery, daemon=True)
        t2.start()
        
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
    print("[SEMAFORO] Iniciando... (Ctrl+C para encerrar)")
    Semaforo().start()
