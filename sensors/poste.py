import socket
import struct
import threading
import time
import iot_pb2 as proto

MEU_ID = "poste_avenida"
MINHA_PORTA_TCP = 8002
MCAST_GRP = '224.1.1.1'
MCAST_PORT = 5007

class PosteLuz:
    def __init__(self):
        self.intensidade = "0%"

    def anunciar_presenca(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
        
        msg = proto.Mensagem()
        msg.id_origem = MEU_ID
        msg.tipo_mensagem = "REGISTRO"
        msg.registro.porta = MINHA_PORTA_TCP
        msg.registro.tipo_dispositivo = "ATUADOR"
        
        print(f"💡 [POSTE] Anunciando presença via Multicast...")
        sock.sendto(msg.SerializeToString(), (MCAST_GRP, MCAST_PORT))

    def ouvir_comandos(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind(('0.0.0.0', MINHA_PORTA_TCP))
        server.listen(5)
        print(f"💡 [POSTE] Aguardando comandos na porta {MINHA_PORTA_TCP}")

        while True:
            client, _ = server.accept()
            try:
                data = client.recv(1024)
                msg = proto.Mensagem()
                msg.ParseFromString(data)
                
                if msg.tipo_mensagem == "COMANDO" and msg.comando.acao == "SET_INTENSIDADE":
                    self.intensidade = msg.comando.param
                    print(f"💡 [ACAO] Intensidade ajustada para: {self.intensidade}")
            except: pass
            client.close()

    def start(self):
        t = threading.Thread(target=self.ouvir_comandos)
        t.start()
        time.sleep(1)
        self.anunciar_presenca()

if __name__ == "__main__":
    PosteLuz().start()