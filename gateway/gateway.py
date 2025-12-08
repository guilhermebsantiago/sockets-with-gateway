import socket
import struct
import threading
import signal
import sys
import time
import iot_pb2 as proto

running = True

def signal_handler(sig, frame):
    global running
    print("\n[GATEWAY] Encerrando...")
    running = False
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class IoTGateway:
    def __init__(self):
        # Configuracoes de Rede
        self.HOST = '0.0.0.0'
        self.PORTA_CLIENTES = 9000  # Onde o usuario conecta (TCP)
        self.PORTA_DADOS = 9001     # Onde sensores mandam dados (UDP)
        
        # Multicast
        self.MCAST_GRP = '224.1.1.1'
        self.MCAST_PORT = 5007

        # Tabela de Roteamento { 'id': {'ip': '...', 'porta': 1234, 'tipo': '...'} }
        self.dispositivos = {} 
        self.clientes = []
        self.sockets = []

    def log(self, msg):
        print(f"[GATEWAY] {msg}")

    def enviar_discovery(self):
        """Envia mensagem de descoberta pedindo para dispositivos se anunciarem"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack('b', 1))
            
            msg = proto.Mensagem()
            msg.id_origem = "gateway"
            msg.tipo_mensagem = "DISCOVERY"
            
            self.log("Enviando pedido de descoberta via Multicast...")
            sock.sendto(msg.SerializeToString(), (self.MCAST_GRP, self.MCAST_PORT))
            sock.close()
        except Exception as e:
            self.log(f"Erro ao enviar discovery: {e}")

    # --- 1. DESCOBERTA (UDP MULTICAST) ---
    def iniciar_descoberta(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('', self.MCAST_PORT))
        sock.settimeout(1.0)  # Timeout para permitir verificar flag running
        self.sockets.append(sock)
        
        # Entra no grupo Multicast
        mreq = struct.pack("4sl", socket.inet_aton(self.MCAST_GRP), socket.INADDR_ANY)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        
        self.log(f"Aguardando dispositivos via Multicast em {self.MCAST_GRP}:{self.MCAST_PORT}")

        while running:
            try:
                data, addr = sock.recvfrom(1024)
                try:
                    msg = proto.Mensagem()
                    msg.ParseFromString(data)
                    
                    if msg.tipo_mensagem == "REGISTRO":
                        d_id = msg.id_origem
                        is_new = d_id not in self.dispositivos
                        self.dispositivos[d_id] = {
                            'ip': addr[0], 
                            'porta': msg.registro.porta,
                            'tipo': msg.registro.tipo_dispositivo
                        }
                        if is_new:
                            self.log(f"Novo dispositivo registrado: {d_id} ({msg.registro.tipo_dispositivo})")
                        else:
                            self.log(f"Dispositivo reconectado: {d_id}")
                        # Notificar clientes sobre novo dispositivo
                        self.broadcast_clientes(f"[REGISTRO] {d_id}:{msg.registro.tipo_dispositivo}:{msg.registro.porta}")
                    
                    elif msg.tipo_mensagem == "DESREGISTRO":
                        d_id = msg.id_origem
                        if d_id in self.dispositivos:
                            del self.dispositivos[d_id]
                            self.log(f"Dispositivo desregistrado: {d_id}")
                            # Notificar clientes que dispositivo foi removido
                            self.broadcast_clientes(f"[DESREGISTRO] {d_id}")
                except: pass
            except socket.timeout:
                continue
            except:
                break

    # --- 2. DADOS DE SENSORES (UDP) ---
    def iniciar_dados(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((self.HOST, self.PORTA_DADOS))
        sock.settimeout(1.0)
        self.sockets.append(sock)
        self.log(f"Ouvindo dados de sensores na porta {self.PORTA_DADOS}")

        while running:
            try:
                data, addr = sock.recvfrom(1024)
                try:
                    msg = proto.Mensagem()
                    msg.ParseFromString(data)
                    if msg.tipo_mensagem == "DADOS":
                        # Registrar dispositivo automaticamente se nao existir
                        d_id = msg.id_origem
                        if d_id not in self.dispositivos:
                            self.dispositivos[d_id] = {
                                'ip': addr[0],
                                'porta': 0,  # Sensor UDP nao tem porta TCP
                                'tipo': 'SENSOR'
                            }
                            self.log(f"Sensor descoberto via dados: {d_id}")
                            self.broadcast_clientes(f"[REGISTRO] {d_id}:SENSOR:0")
                        
                        txt = f"[{msg.id_origem}] {msg.dados.tipo_leitura}: {msg.dados.valor:.1f} {msg.dados.unidade}"
                        print(f" -> {txt}")
                        self.broadcast_clientes(txt)
                except: pass
            except socket.timeout:
                continue
            except:
                break

    # --- 3. CONTROLE DE CLIENTES (TCP) ---
    def iniciar_clientes(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((self.HOST, self.PORTA_CLIENTES))
        server.listen(5)
        server.settimeout(1.0)
        self.sockets.append(server)
        self.log(f"Painel de Controle disponivel na porta {self.PORTA_CLIENTES}")
        
        while running:
            try:
                client, addr = server.accept()
                self.clientes.append(client)
                self.log(f"Cliente conectado: {addr}")
                threading.Thread(target=self.handle_client, args=(client,), daemon=True).start()
            except socket.timeout:
                continue
            except:
                break

    def handle_client(self, client):
        client.send(b"Conectado. Use: ID:ACAO:PARAM\n")
        client.settimeout(1.0)
        
        # Enviar lista de dispositivos ja registrados
        for d_id, info in self.dispositivos.items():
            msg = f"[REGISTRO] {d_id}:{info['tipo']}:{info['porta']}\n"
            try:
                client.send(msg.encode())
            except: pass
        
        while running:
            try:
                data = client.recv(1024)
                if not data: break
                cmd_str = data.decode().strip()
                parts = cmd_str.split(':')
                
                if parts[0] == "LISTAR":
                    # Comando para listar dispositivos
                    for d_id, info in self.dispositivos.items():
                        msg = f"[REGISTRO] {d_id}:{info['tipo']}:{info['porta']}\n"
                        client.send(msg.encode())
                elif parts[0] == "DISCOVERY":
                    # Comando para forcar descoberta
                    self.enviar_discovery()
                    client.send(b"[OK] Pedido de descoberta enviado\n")
                elif len(parts) == 3:
                    self.enviar_comando_device(parts[0], parts[1], parts[2])
                    client.send(f"[OK] Comando enviado para {parts[0]}\n".encode())
                else:
                    client.send(b"Formato invalido. Use: ID:ACAO:PARAM\n")
            except socket.timeout:
                continue
            except:
                if client in self.clientes:
                    self.clientes.remove(client)
                break

    def enviar_comando_device(self, d_id, acao, param):
        if d_id in self.dispositivos:
            dev = self.dispositivos[d_id]
            if dev['porta'] == 0:
                self.log(f"Dispositivo {d_id} e apenas sensor (sem porta TCP)")
                return
            try:
                # Conexao TCP temporaria para enviar o comando
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(5)
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
        for c in self.clientes[:]:  # Copia da lista para evitar problemas
            try: 
                c.send(f"{txt}\n".encode())
            except: 
                if c in self.clientes:
                    self.clientes.remove(c)

    def cleanup(self):
        """Limpa recursos ao encerrar"""
        for sock in self.sockets:
            try:
                sock.close()
            except:
                pass
        for client in self.clientes:
            try:
                client.close()
            except:
                pass

    def start(self):
        t1 = threading.Thread(target=self.iniciar_descoberta, daemon=True)
        t2 = threading.Thread(target=self.iniciar_dados, daemon=True)
        t3 = threading.Thread(target=self.iniciar_clientes, daemon=True)
        t1.start()
        t2.start()
        t3.start()
        
        self.log("Gateway iniciado! Pressione Ctrl+C para encerrar.")
        
        # Aguardar threads iniciarem
        time.sleep(1)
        
        # Enviar pedido de descoberta para encontrar dispositivos ja rodando
        self.enviar_discovery()
        
        # Enviar novamente apos alguns segundos (caso algum dispositivo nao tenha respondido)
        time.sleep(2)
        self.enviar_discovery()
        
        self.log(f"Dispositivos registrados: {len(self.dispositivos)}")
        
        try:
            while running:
                # Loop principal - permite Ctrl+C funcionar
                time.sleep(0.5)
        except KeyboardInterrupt:
            pass
        finally:
            self.log("Encerrando gateway...")
            self.cleanup()

if __name__ == "__main__":
    print("[GATEWAY] Iniciando... (Ctrl+C para encerrar)")
    IoTGateway().start()
