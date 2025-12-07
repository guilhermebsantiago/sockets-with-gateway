import socket

GATEWAY_IP = 'localhost'
GATEWAY_PORT = 9000

def main():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.connect((GATEWAY_IP, GATEWAY_PORT))
        print("--- Conectado ao Gateway ---")

    except:
        print("Erro ao conectar no Gateway.")
        return

    # Thread simples para ler respostas/logs do gateway (opcional)
    # Aqui apenas enviamos para simplificar
    
    while True:
        cmd = input("Comando > ")
        if cmd == "sair": break
        if cmd:
            s.send(cmd.encode())

if __name__ == "__main__":
    main()