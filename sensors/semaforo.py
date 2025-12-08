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
GATEWAY_UDP_PORT = config.GATEWAY_UDP_PORT

# Tempos padrão em segundos
TEMPO_VERMELHO = 10
TEMPO_AMARELO = 3
TEMPO_VERDE = 10

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
        self.tempo_vermelho = TEMPO_VERMELHO
        self.tempo_amarelo = TEMPO_AMARELO
        self.tempo_verde = TEMPO_VERDE
        self.modo_auto = True  # Modo automático ligado por padrão

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

    def enviar_estado(self):
        """Envia estado atual do semáforo para o Gateway"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            
            msg = proto.Mensagem()
            msg.id_origem = MEU_ID
            msg.tipo_mensagem = "DADOS"
            msg.dados.valor = 0  # Não usado
            msg.dados.unidade = self.cor_atual
            msg.dados.tipo_leitura = "COR_SEMAFORO"
            
            sock.sendto(msg.SerializeToString(), ('localhost', GATEWAY_UDP_PORT))
            sock.close()
        except:
            pass

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
                        time.sleep(0.1)
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
                        acao = msg.comando.acao
                        param = msg.comando.param
                        
                        if acao == "MUDAR_COR":
                            self.cor_atual = param.upper()
                            print(f"[ACAO] Cor alterada manualmente para: {self.cor_atual}")
                            self.enviar_estado()
                        elif acao == "SET_TEMPO_VERMELHO":
                            self.tempo_vermelho = int(param)
                            print(f"[CONFIG] Tempo vermelho: {self.tempo_vermelho}s")
                        elif acao == "SET_TEMPO_AMARELO":
                            self.tempo_amarelo = int(param)
                            print(f"[CONFIG] Tempo amarelo: {self.tempo_amarelo}s")
                        elif acao == "SET_TEMPO_VERDE":
                            self.tempo_verde = int(param)
                            print(f"[CONFIG] Tempo verde: {self.tempo_verde}s")
                except: pass
                client.close()
            except socket.timeout:
                continue
            except:
                break

    def ciclo_automatico(self):
        """Executa o ciclo automático do semáforo"""
        while running:
            if self.modo_auto:
                # Vermelho
                self.cor_atual = "VERMELHO"
                print(f"[AUTO] Semaforo: {self.cor_atual} ({self.tempo_vermelho}s)")
                self.enviar_estado()
                self._aguardar(self.tempo_vermelho)
                
                if not running: break
                
                # Verde
                self.cor_atual = "VERDE"
                print(f"[AUTO] Semaforo: {self.cor_atual} ({self.tempo_verde}s)")
                self.enviar_estado()
                self._aguardar(self.tempo_verde)
                
                if not running: break
                
                # Amarelo
                self.cor_atual = "AMARELO"
                print(f"[AUTO] Semaforo: {self.cor_atual} ({self.tempo_amarelo}s)")
                self.enviar_estado()
                self._aguardar(self.tempo_amarelo)
            else:
                time.sleep(0.5)
    
    def _aguardar(self, segundos):
        """Aguarda X segundos, verificando a flag running"""
        for _ in range(segundos * 2):
            if not running:
                return
            time.sleep(0.5)

    def start(self):
        # Thread para ouvir comandos TCP
        t1 = threading.Thread(target=self.ouvir_comandos, daemon=True)
        t1.start()
        
        # Thread para ouvir DISCOVERY do Gateway
        t2 = threading.Thread(target=self.ouvir_discovery, daemon=True)
        t2.start()
        
        # Thread para ciclo automático
        t3 = threading.Thread(target=self.ciclo_automatico, daemon=True)
        t3.start()
        
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
    print(f"[SEMAFORO] Tempos: Vermelho={TEMPO_VERMELHO}s, Verde={TEMPO_VERDE}s, Amarelo={TEMPO_AMARELO}s")
    Semaforo().start()
