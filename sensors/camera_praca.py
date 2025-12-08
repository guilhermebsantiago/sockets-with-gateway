import socket
import struct
import threading
import time
import iot_pb2 as proto

# Configurações Específicas
MEU_ID = "camera_praca_central_02"
MINHA_PORTA_TCP = 8005 # Porta TCP diferente
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

class CameraPraca:
    def __init__(self):
        self.ligada = True
        self.resolucao = "FullHD" 

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "ATUADOR" 
        
        print(f"📸 [CAM-PRACA] Anunciando presença via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def ouvir_comandos(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        server.listen(5)
        print(f"📸 [CAM-PRACA] Aguardando comandos na porta {MINHA_PORTA_TCP}")
        
        while True:
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
                        print(f"📸 [ACAO] Câmera ligada.")
                    elif acao == "DESLIGAR":
                        self.ligada = False
                        print(f"📸 [ACAO] Câmera desligada.")
                    elif acao == "SET_RESOLUCAO":
                        if self.ligada:
                             self.resolucao = param
                             print(f"📸 [CONFIG] Resolução alterada para: {self.resolucao}")
                        else:
                             print(f"📸 [ERRO] Câmera desligada. Não foi possível alterar a resolução.")

            except Exception as e: 
                pass
            client.close()

    def start(self):
        t = threading.Thread(target=self.ouvir_comandos)
        t.start()
        time.sleep(1) 
        self.anunciar_presenca()

if __name__ == "__main__":
    CameraPraca().start()