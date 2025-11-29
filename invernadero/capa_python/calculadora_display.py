import serial
import tkinter as tk
from tkinter import ttk

# Configuración del puerto COM
PORT = 'COM7'  # ← Asegúrate de que sea el puerto correcto
BAUD = 115200
ser = serial.Serial(PORT, BAUD, timeout=1)

# Crear ventana principal
root = tk.Tk()
root.title("Panel de Control — ESP32 A")
root.geometry("400x500")
root.configure(bg="#f0f4f7")

# Estilo visual
style = ttk.Style()
style.theme_use("clam")
style.configure("TLabel", font=("Segoe UI", 12), background="#f0f4f7")
style.configure("TButton", font=("Segoe UI", 10), padding=6)
style.configure("Header.TLabel", font=("Segoe UI", 16, "bold"), background="#f0f4f7")
style.configure("Temp.TLabel", font=("Segoe UI", 28, "bold"), foreground="#007acc", background="#f0f4f7")

# Variables de interfaz
modo = tk.StringVar(value="Automático")
temperatura_var = tk.StringVar(value="--- °C")
limite_var = tk.StringVar(value="Límite: 15 °C")

# Funciones de control
def actualizar_temperatura():
    if ser.in_waiting:
        linea = ser.readline().decode('utf-8').strip()
        if "Temp:" in linea:
            try:
                valor = linea.split("Temp:")[1].strip()
                temperatura_var.set(f"{valor} °C")
            except:
                temperatura_var.set("Error")
    root.after(500, actualizar_temperatura)

def cambiar_modo():
    if modo.get() == "Automático":
        modo.set("Manual")
        ser.write(b'M')
    else:
        modo.set("Automático")
        ser.write(b'A')

def encender_foco():
    ser.write(b'F')

def apagar_foco():
    ser.write(b'f')

def encender_ventilador():
    ser.write(b'V')

def apagar_ventilador():
    ser.write(b'v')

def actualizar_limite():
    nuevo = entrada_limite.get()
    if nuevo.isdigit():
        ser.write(b'L' + nuevo.encode() + b'\n')
        limite_var.set(f"Límite: {nuevo} °C")

# Construcción de la interfaz
ttk.Label(root, text="Control de Temperatura", style="Header.TLabel").pack(pady=(20, 5))
ttk.Label(root, textvariable=temperatura_var, style="Temp.TLabel").pack(pady=(0, 10))

ttk.Label(root, textvariable=limite_var).pack()
entrada_limite = ttk.Entry(root, justify="center", font=("Segoe UI", 10))
entrada_limite.pack(pady=5)
ttk.Button(root, text="Actualizar límite", command=actualizar_limite).pack(pady=5)

ttk.Label(root, text="Modo de control:").pack(pady=(15, 5))
ttk.Button(root, textvariable=modo, command=cambiar_modo).pack()

frame_botones = ttk.LabelFrame(root, text="Control Manual", padding=10)
frame_botones.pack(pady=20, fill="x", padx=20)

ttk.Button(frame_botones, text="Encender Foco", command=encender_foco).grid(row=0, column=0, padx=10, pady=5)
ttk.Button(frame_botones, text="Apagar Foco", command=apagar_foco).grid(row=0, column=1, padx=10, pady=5)
ttk.Button(frame_botones, text="Encender Ventilador", command=encender_ventilador).grid(row=1, column=0, padx=10, pady=5)
ttk.Button(frame_botones, text="Apagar Ventilador", command=apagar_ventilador).grid(row=1, column=1, padx=10, pady=5)

# Iniciar ciclo de lectura
actualizar_temperatura()
root.mainloop()