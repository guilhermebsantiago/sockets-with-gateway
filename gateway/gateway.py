import socket
import struct
import threading
import iot_pb2 as proto

class IoTGateway:
    def __init__(self):
        # Configurações de Rede
        self.HOST = '0.0.0.0'
        self.PORTA_CLIENTES = 9000  # Onde o usuario conecta (TCP)
        self.PORTA_DADOS = 9001     # Onde sensores mandam dados (UDP)
        
        # Multicast
        self.MCAST_GRP = '224.1.1.1'
        self.MCAST_PORT = 5007

        # Tabela de Roteamento { 'id': {'ip': '...', 'porta': 1234} }
        self.dispositivos = {} 
        self.clientes = []

    def log(self, msg):
        print(f"[GATEWAY] {msg}")

    # --- 1. DESCOBERTA (UDP MULTICAST) ---
    def iniciar_descoberta(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('', self.MCAST_PORT))
        
        # Entra no grupo Multicast
        mreq = struct.pack("4sl", socket.inet_aton(self.MCAST_GRP), socket.INADDR_ANY)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        
        self.log(f"Aguardando dispositivos via Multicast em {self.MCAST_GRP}:{self.MCAST_PORT}")

        while True:
            data, addr = sock.recvfrom(1024)
            try:
                msg = proto.Mensagem()
                msg.ParseFromString(data)
                
                if msg.tipo_mensagem == "REGISTRO":
                    d_id = msg.id_origem
                    self.dispositivos[d_id] = {
                        'ip': addr[0], 
                        'porta': msg.registro.porta,
                        'tipo': msg.registro.tipo_dispositivo
                    }
                    self.log(f"Novo dispositivo registrado: {d_id} ({msg.registro.tipo_dispositivo})")
            except: pass

    # --- 2. DADOS DE SENSORES (UDP) ---
    def iniciar_dados(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.bind((self.HOST, self.PORTA_DADOS))
        self.log(f"Ouvindo dados de sensores na porta {self.PORTA_DADOS}")

        while True:
            data, _ = sock.recvfrom(1024)
            try:
                msg = proto.Mensagem()
                msg.ParseFromString(data)
                if msg.tipo_mensagem == "DADOS":
                    txt = f"[{msg.id_origem}] {msg.dados.tipo_leitura}: {msg.dados.valor:.1f} {msg.dados.unidade}"
                    print(f" -> {txt}")
                    self.broadcast_clientes(txt)
            except: pass

    # --- 3. CONTROLE DE CLIENTES (TCP) ---
    def iniciar_clientes(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind((self.HOST, self.PORTA_CLIENTES))
        server.listen(5)
        self.log(f"Painel de Controle disponível na porta {self.PORTA_CLIENTES}")
        
        while True:
            client, _ = server.accept()
            self.clientes.append(client)
            threading.Thread(target=self.handle_client, args=(client,)).start()

    def handle_client(self, client):
        client.send(b"Conectado. Use: ID:ACAO:PARAM\n")
        while True:
            try:
                data = client.recv(1024)
                if not data: break
                cmd_str = data.decode().strip()
                parts = cmd_str.split(':')
                
                if len(parts) == 3:
                    self.enviar_comando_device(parts[0], parts[1], parts[2])
                else:
                    client.send(b"Formato invalido.\n")
            except:
                self.clientes.remove(client)
                break

    def enviar_comando_device(self, d_id, acao, param):
        if d_id in self.dispositivos:
            dev = self.dispositivos[d_id]
            try:
                # Conexão TCP temporária para enviar o comando
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.connect((dev['ip'], dev['porta']))
                
                msg = proto.Mensagem()
                msg.tipo_mensagem = "COMANDO"
                msg.comando.acao = acao
                msg.comando.param = param
                
                s.send(msg.SerializeToString())
                s.close()
                self.log(f"Comando enviado para {d_id}: {acao} {param}")
            except Exception as e:
                self.log(f"Erro ao conectar com {d_id}: {e}")
        else:
            self.log(f"Dispositivo {d_id} desconhecido.")

    def broadcast_clientes(self, txt):
        for c in self.clientes:
            try: c.send(f"{txt}\n".encode())
            except: pass

    def start(self):
        t1 = threading.Thread(target=self.iniciar_descoberta)
        t2 = threading.Thread(target=self.iniciar_dados)
        t3 = threading.Thread(target=self.iniciar_clientes)
        t1.start(); t2.start(); t3.start()
        t1.join(); t2.join(); t3.join()

if __name__ == "__main__":
    IoTGateway().start()