import socket
import struct
import threading
import time
import iot_pb2 as proto

# Configurações
MEU_ID = "semaforo_principal"
MINHA_PORTA_TCP = 8001
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

class Semaforo:
    def __init__(self):
        self.cor_atual = "VERMELHO"

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "ATUADOR" # Semáforo é atuador
        
        print(f"🚦 [SEMAFORO] Anunciando presença via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def ouvir_comandos(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        server.listen(5)
        print(f"🚦 [SEMAFORO] Aguardando comandos na porta {MINHA_PORTA_TCP}")

        while True:
            client, _ = server.accept()
            try:
                data = client.recv(1024)
                msg = proto.Mensagem()
                msg.ParseFromString(data)
                
                if msg.tipo_mensagem == "COMANDO":
                    nova_cor = msg.comando.param
                    self.cor_atual = nova_cor
                    print(f"🚦 [ACAO] Mudando luz para: {self.cor_atual}")
            except: pass
            client.close()

    def start(self):
        t = threading.Thread(target=self.ouvir_comandos)
        t.start()
        time.sleep(1) # Espera thread subir
        self.anunciar_presenca()

if __name__ == "__main__":
    Semaforo().start()