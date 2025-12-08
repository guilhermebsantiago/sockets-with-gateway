# 🎬 Roteiro de Apresentação - Smart City (5 min)

## 📋 Identificação
- **Nome:** [Seu Nome]
- **Matrícula:** [Sua Matrícula]
- **Repositório:** https://github.com/guilhermebsantiago/sockets-with-gateway

---

## 🏗️ Ambiente Inteligente

**Cidade Inteligente** com os seguintes dispositivos:

| Dispositivo | Tipo | Intervalo de Dados |
|-------------|------|-------------------|
| Semáforo | Atuador | Muda cor a cada 10s |
| Poste de Luz | Atuador | - |
| Radar de Velocidade | Misto | Envia velocidade a cada 4s |
| Câmera Estacionamento | Atuador | - |
| Câmera Praça | Atuador | - |
| Sensor de Temperatura | Sensor | Envia dados a cada 15s |
| Sensor Qualidade do Ar | Sensor | Envia dados a cada 20s |

---

## 🛠️ Tecnologias Utilizadas

| Componente | Linguagem | Bibliotecas |
|------------|-----------|-------------|
| Gateway | Python 3 | socket, threading, protobuf |
| Sensores/Atuadores | Python 3 | socket, threading, protobuf |
| Backend Proxy | Node.js + TypeScript | ws, net |
| Frontend (PWA) | React + TypeScript | Vite, Tailwind CSS, Zustand, Framer Motion |

**Pontos Extras:**
- ✅ Interface Gráfica (React)
- ✅ PWA Mobile (vite-plugin-pwa)
- ✅ Múltiplas Linguagens (Python + TypeScript)

---

## 📡 Formatos de Mensagens

### Descoberta (UDP Multicast 224.1.1.1:5007)
```protobuf
message Mensagem {
  id_origem: "semaforo_principal"
  tipo_mensagem: "REGISTRO"
  registro {
    porta: 8001
    tipo_dispositivo: "ATUADOR"
  }
}
```

### Dados de Sensores (UDP :9001)
```protobuf
message Mensagem {
  id_origem: "radar_velocidade_01"
  tipo_mensagem: "DADOS"
  dados {
    valor: 85.5
    unidade: "km/h"
    tipo_leitura: "VELOCIDADE"
  }
}
```

### Comandos (TCP)
```
ID:ACAO:PARAM
Exemplo: semaforo_principal:MUDAR_COR:VERDE
```

### Cliente ↔ Gateway (TCP :9000)
```
[REGISTRO] id:tipo:porta
[id] TIPO_LEITURA: valor unidade
[DESREGISTRO] id
[OK] Comando enviado
```

---

# 🎥 ROTEIRO DA GRAVAÇÃO

## ⏱️ 0:00 - Introdução (30s)
> "Olá, vou apresentar o projeto Smart City para a disciplina de Sistemas Distribuídos."

Mostrar rapidamente:
- Estrutura do projeto no VS Code
- README.md

---

## ⏱️ 0:30 - Passo 1: Iniciar 2 dispositivos ANTES do Gateway

**Terminal 1 - Semáforo:**
```powershell
cd C:\Users\guilh\dev\sockets-distribuidos\sensors
python semaforo.py
```

**Terminal 2 - Radar:**
```powershell
cd C:\Users\guilh\dev\sockets-distribuidos\sensors
python radar.py
```

> "Estou iniciando o semáforo e o radar ANTES do Gateway para demonstrar a descoberta."

---

## ⏱️ 1:00 - Passo 2: Iniciar Gateway

**Terminal 3 - Gateway:**
```powershell
cd C:\Users\guilh\dev\sockets-distribuidos\gateway
python gateway.py
```

> "Agora inicio o Gateway. Observe que ele envia DISCOVERY via Multicast e os dispositivos respondem."

**Mostrar no terminal:**
- `[GATEWAY] Enviando pedido de descoberta via Multicast...`
- `[GATEWAY] Novo dispositivo registrado: semaforo_principal`
- `[GATEWAY] Novo dispositivo registrado: radar_velocidade_01`

---

## ⏱️ 1:30 - Passo 3-5: Conectar Cliente e Consultar Estados

**Terminal 4 - Backend:**
```powershell
cd C:\Users\guilh\dev\sockets-distribuidos\client\backend
npm run dev
```

**Terminal 5 - Frontend:**
```powershell
cd C:\Users\guilh\dev\sockets-distribuidos\client\frontend
npm run dev
```

> "Agora conecto o cliente. O backend faz a ponte WebSocket ↔ TCP com o Gateway."

**Abrir navegador:** http://localhost:5173

> "No dashboard vejo os dispositivos conectados, seus estados e dados em tempo real."

**Mostrar:**
- Semáforo mudando de cor automaticamente
- Radar enviando velocidades
- Status online dos dispositivos

---

## ⏱️ 2:00 - Passo 6-7: Enviar Comandos e Monitorar

> "Vou enviar comandos para os dispositivos."

**Na interface:**
1. Clicar no **Semáforo** → Clicar "Mudar Cor"
2. Clicar no **Poste** (se houver) → Ajustar luminosidade
3. Mostrar dados do **Radar** atualizando em tempo real

> "Os comandos são enviados via TCP e os dispositivos respondem."

---

## ⏱️ 2:30 - Passo 8-9: Desligar e Iniciar Dispositivo

> "Agora vou desligar o Radar."

**No terminal do Radar:** Pressionar `Ctrl+C`

> "Observe no dashboard que o dispositivo desapareceu com animação de fade out."

**Iniciar novo dispositivo:**
```powershell
cd C:\Users\guilh\dev\sockets-distribuidos\sensors
python sensor_temperatura.py
```

> "Inicio o sensor de temperatura. Ele é descoberto automaticamente pelo Gateway."

**Mostrar no dashboard:**
- Novo dispositivo aparece
- Dados de temperatura atualizando

---

## ⏱️ 3:00 - Passo 10-13: Desligar e Reiniciar Gateway

> "Agora vou desligar o Gateway para ver o comportamento."

**No terminal do Gateway:** Pressionar `Ctrl+C`

> "Observe que o cliente perde conexão mas os dispositivos continuam rodando."

**Mostrar no dashboard:** Status "Desconectado"

**Reiniciar Gateway:**
```powershell
python gateway.py
```

> "Ao reiniciar o Gateway, ele envia DISCOVERY novamente e os dispositivos se re-registram."

**Reconectar cliente:** Clicar no botão de conexão no dashboard

> "Cliente reconectado. Os dispositivos aparecem novamente."

---

## ⏱️ 3:30 - Passo 14-17: Novo Dispositivo e Comandos

**Iniciar mais um sensor:**
```powershell
python sensor_ar.py
```

> "Inicio o sensor de qualidade do ar. Veja que ele aparece no dashboard."

**Na interface:**
1. Consultar estados de todos os dispositivos
2. Configurar alerta no sensor de temperatura (ex: max 30°C)
3. Mostrar alerta visual se temperatura passar do limite

---

## ⏱️ 4:00 - Passo 18-19: Desligar Sensores

> "Vou desligar todos os sensores para mostrar o desregistro."

**Nos terminais dos sensores:** Pressionar `Ctrl+C` em cada um

> "Cada sensor envia DESREGISTRO antes de desligar. O dashboard atualiza em tempo real."

---

## ⏱️ 4:15 - PWA Mobile (Pontos Extras)

> "Para os pontos extras, vou mostrar o PWA no meu celular."

**Opção 1 - ngrok:**
```powershell
ngrok http 5173
```

> "Usando ngrok para expor o servidor via HTTPS."

**No celular:**
1. Acessar URL do ngrok
2. Mostrar "Adicionar à tela inicial"
3. Abrir como app instalado
4. Mostrar interface funcionando
5. Mostrar ícone do app na home

> "O PWA funciona como um app nativo no celular."

---

## ⏱️ 4:45 - Encerramento

> "Encerrando a demonstração."

```powershell
.\stop.ps1
```

> "Obrigado pela atenção. O código está disponível no GitHub."

**Mostrar:** Link do repositório

---

# 📝 Checklist Final

- [ ] Mostrar descoberta (dispositivos antes do Gateway)
- [ ] Mostrar DISCOVERY do Gateway
- [ ] Mostrar dados em tempo real
- [ ] Enviar comandos (mudar cor, luminosidade)
- [ ] Desligar dispositivo (fade out)
- [ ] Iniciar novo dispositivo (descoberta automática)
- [ ] Desligar Gateway (cliente perde conexão)
- [ ] Reiniciar Gateway (reconexão)
- [ ] Mostrar alertas dos sensores
- [ ] PWA no celular (ponto extra!)
- [ ] Mostrar link do GitHub

---

# 🆘 Comandos Rápidos

```powershell
# Iniciar tudo de uma vez
.\start.ps1

# Parar tudo
.\stop.ps1

# Iniciar dispositivos individuais
cd sensors
python semaforo.py
python poste.py
python radar.py
python camera_estacionamento.py
python camera_praca.py
python sensor_temperatura.py
python sensor_ar.py

# Gateway
cd gateway
python gateway.py

# Backend
cd client\backend
npm run dev

# Frontend
cd client\frontend
npm run dev

# ngrok para PWA
ngrok http 5173
```

