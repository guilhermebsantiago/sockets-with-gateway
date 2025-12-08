import socket
import struct
import threading
import time
import signal
import sys
import iot_pb2 as proto

MEU_ID = "camera_estacionamento_01"
MINHA_PORTA_TCP = 8004
GATEWAY_UDP_PORT = 9001
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

running = True

def signal_handler(sig, frame):
    global running
    print("\n[CAM-EST] Encerrando...")
    running = False
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class CameraEstacionamento:
    def __init__(self):
        self.ligada = True
        self.resolucao = "HD"

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "ATUADOR" 
        
        print(f"[CAM-EST] Anunciando presenca via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def ouvir_comandos(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        server.listen(5)
        server.settimeout(1.0)
        print(f"[CAM-EST] Aguardando comandos na porta {MINHA_PORTA_TCP}")
        
        while running:
            try:
                client, _ = server.accept()
                try:
                    data = client.recv(1024)
                    msg = proto.Mensagem()
                    msg.ParseFromString(data)
                    
                    if msg.tipo_mensagem == "COMANDO":
                        acao = msg.comando.acao
                        param = msg.comando.param

                        if acao == "LIGAR":
                            self.ligada = True
                            print(f"[ACAO] Camera ligada.")
                        elif acao == "DESLIGAR":
                            self.ligada = False
                            print(f"[ACAO] Camera desligada.")
                        elif acao == "SET_RESOLUCAO":
                            if self.ligada:
                                 self.resolucao = param
                                 print(f"[CONFIG] Resolucao alterada para: {self.resolucao}")
                            else:
                                 print(f"[ERRO] Camera desligada. Nao foi possivel alterar a resolucao.")

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

if __name__ == "__main__":
    print("[CAM-EST] Iniciando... (Ctrl+C para encerrar)")
    CameraEstacionamento().start()
