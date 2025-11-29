from flask import Flask, render_template, jsonify, request
import json, os, random, serial, threading, time

# Configuración
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(APP_DIR, "preguntas.json")
SERIAL_PORT = "COM3"  # <--- ¡VERIFICA TU PUERTO!
BAUD_RATE = 115200

app = Flask(__name__)

# Estado global del Joystick
joystick_state = {"x": 2048, "y": 2048, "sw": 0, "btn": 0, "connected": False}
serial_lock = threading.Lock()

def serial_worker():
    """Hilo que lee el Arduino en segundo plano"""
    global joystick_state
    ser = None
    
    while True:
        if ser is None:
            try:
                ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1)
                print(f"✅ Conectado a {SERIAL_PORT}")
                time.sleep(2)
                ser.write(b'L') # Encender LED
                with serial_lock:
                    joystick_state["connected"] = True
            except Exception:
                with serial_lock:
                    joystick_state["connected"] = False
                time.sleep(2)
                continue

        try:
            if ser.in_waiting:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line.startswith("X:"):
                    parts = line.split()
                    with serial_lock:
                        joystick_state["x"] = int(parts[0].split(":")[1])
                        joystick_state["y"] = int(parts[1].split(":")[1])
                        joystick_state["sw"] = int(parts[2].split(":")[1])
                        joystick_state["btn"] = int(parts[3].split(":")[1])
                        joystick_state["connected"] = True
        except Exception as e:
            print(f"❌ Desconexión: {e}")
            try: ser.close()
            except: pass
            ser = None
            with serial_lock:
                joystick_state["connected"] = False
        
        time.sleep(0.01)

# Iniciar hilo serial
t = threading.Thread(target=serial_worker, daemon=True)
t.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_input')
def get_input():
    with serial_lock:
        return jsonify(joystick_state)

@app.route('/questions')
def questions():
    limit = int(request.args.get("limit", 35))
    if not os.path.exists(DATA_PATH): return jsonify({"items": []})
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("items", [])
    random.shuffle(items)
    return jsonify({"items": items[:limit]})

if __name__ == "__main__":
    # use_reloader=False evita el error de "Permiso denegado" en el puerto COM
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)