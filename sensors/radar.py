import socket
import struct
import threading
import time
import random
import signal
import sys
import iot_pb2 as proto
import config

MEU_ID = "radar_velocidade_01"
MINHA_PORTA_TCP = config.RADAR_PORT
GATEWAY_UDP_PORT = config.GATEWAY_UDP_PORT
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
        msg.registro.tipo_dispositivo = "MISTO"
        
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))
        sock.close()
    except:
        pass

def signal_handler(sig, frame):
    global running
    print("\n[RADAR] Encerrando...")
    running = False
    enviar_desregistro()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class Radar:
    def __init__(self):
        self.resolucao = "720p"
        self.ligado = True  # Estado ligado/desligado

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "MISTO"
        
        print(f"[RADAR] Anunciando presenca via Multicast (porta {MINHA_PORTA_TCP})...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))
        sock.close()

    def ouvir_discovery(self):
        """Escuta mensagens de DISCOVERY do Gateway e re-anuncia"""
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
                        print(f"[RADAR] Recebido pedido de descoberta do Gateway")
                        time.sleep(0.3)
                        self.anunciar_presenca()
                except:
                    pass
            except socket.timeout:
                continue
            except:
                break

    def ouvir_comandos(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        server.listen(5)
        server.settimeout(1.0)
        print(f"[RADAR] Aguardando comandos na porta {MINHA_PORTA_TCP}")
        
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
                        
                        if acao == "SET_RESOLUCAO":
                            self.resolucao = param
                            print(f"[CONFIG] Resolucao alterada para: {self.resolucao}")
                        elif acao == "LIGAR":
                            self.ligado = True
                            print(f"[ACAO] Radar LIGADO - Iniciando captura de velocidade")
                        elif acao == "DESLIGAR":
                            self.ligado = False
                            print(f"[ACAO] Radar DESLIGADO - Parando captura")
                        elif acao == "TOGGLE":
                            self.ligado = not self.ligado
                            estado = "LIGADO" if self.ligado else "DESLIGADO"
                            print(f"[ACAO] Radar {estado}")
                            
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
            
            # Só envia dados se estiver ligado
            if not self.ligado:
                continue
                
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
        threading.Thread(target=self.ouvir_comandos, daemon=True).start()
        threading.Thread(target=self.enviar_velocidade, daemon=True).start()
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
    print("[RADAR] Iniciando... (Ctrl+C para encerrar)")
    Radar().start()
