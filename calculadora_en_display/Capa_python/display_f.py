import tkinter as tk
from tkinter import messagebox
import serial
import time

# --- Configuración de la Conexión Serial ---
ARDUINO_PORT = 'COM5'  # Cambia al puerto correcto
BAUD_RATE = 9600
ser = None

# --- Estilos globales ---
BG_COLOR = "#f4f4f4"
BTN_COLOR = "#4CAF50"
BTN_COLOR_HOVER = "#45a049"
BTN_TEXT_COLOR = "white"
FONT_MAIN = ("Segoe UI", 12)
FONT_DISPLAY = ("Courier", 28, "bold")

# --- Reglas de validación ---
MIN_VAL = 0
MAX_VAL = 99

class CalculadoraESP32:
    def __init__(self, root):
        self.root = root
        self.root.title("Calculadora con ESP32")
        self.root.configure(bg=BG_COLOR)

        # Variables
        self.var_x = tk.StringVar()
        self.var_y = tk.StringVar()
        self.display_val = tk.StringVar(value="00")
        self.memoria = 0  # Guarda el último resultado válido (0–99)

        # Entradas
        tk.Label(root, text="Valor X:", bg=BG_COLOR, font=FONT_MAIN).grid(row=0, column=0, padx=5, pady=5, sticky="e")
        tk.Entry(root, textvariable=self.var_x, width=6, font=FONT_MAIN).grid(row=0, column=1, pady=5)

        tk.Label(root, text="Valor Y:", bg=BG_COLOR, font=FONT_MAIN).grid(row=1, column=0, padx=5, pady=5, sticky="e")
        tk.Entry(root, textvariable=self.var_y, width=6, font=FONT_MAIN).grid(row=1, column=1, pady=5)

        # Display
        tk.Label(root, text="Display:", bg=BG_COLOR, font=FONT_MAIN).grid(row=2, column=0, padx=5, pady=5, sticky="e")
        tk.Label(root, textvariable=self.display_val, width=5, bg="black", fg="lime",
                 font=FONT_DISPLAY, relief="sunken").grid(row=2, column=1, pady=5)

        # Botones de operaciones
        ops = tk.LabelFrame(root, text="Operaciones", bg=BG_COLOR, font=FONT_MAIN, fg="#333")
        ops.grid(row=3, column=0, columnspan=2, pady=10)

        self._crear_boton(ops, "+", self.sumar, 0, 0)
        self._crear_boton(ops, "-", self.restar, 0, 1)
        self._crear_boton(ops, "×", self.multiplicar, 0, 2)
        self._crear_boton(ops, "÷", self.dividir, 0, 3)

        # Botones de control
        ctrl = tk.LabelFrame(root, text="Control", bg=BG_COLOR, font=FONT_MAIN, fg="#333")
        ctrl.grid(row=4, column=0, columnspan=2, pady=10)

        self._crear_boton(ctrl, "Ascendente", lambda: self.enviar_serial("U"), 0, 0, ancho=12)
        self._crear_boton(ctrl, "Descendente", lambda: self.enviar_serial("D"), 0, 1, ancho=12)
        self._crear_boton(ctrl, "Detener", lambda: self.enviar_serial("S"), 1, 0, ancho=12)
        self._crear_boton(ctrl, "Reset", lambda: self.enviar_serial("R"), 1, 1, ancho=12)

        # Estado de conexión
        self.status_label = tk.Label(root, text="Intentando conectar...", fg="orange", bg=BG_COLOR, font=('Segoe UI', 10))
        self.status_label.grid(row=5, column=0, columnspan=2, pady=5)

        self.connect_to_arduino()

    def _crear_boton(self, parent, texto, comando, fila, col, ancho=6):
        btn = tk.Button(parent, text=texto, command=comando,
                        bg=BTN_COLOR, fg=BTN_TEXT_COLOR,
                        activebackground=BTN_COLOR_HOVER,
                        font=FONT_MAIN, relief="flat", width=ancho, height=1)
        btn.grid(row=fila, column=col, padx=5, pady=5)
        return btn

    def connect_to_arduino(self):
        global ser
        try:
            ser = serial.Serial(ARDUINO_PORT, BAUD_RATE, timeout=1)
            time.sleep(2)
            self.status_label.config(text=f"Conectado a {ARDUINO_PORT}", fg="green")
        except serial.SerialException:
            self.status_label.config(text=f"Error: No se pudo conectar a {ARDUINO_PORT}", fg="red")

    def enviar_serial(self, comando: str):
        if ser and ser.is_open:
            ser.write(f"{comando}\n".encode('utf-8'))
        else:
            self.status_label.config(text="Arduino desconectado", fg="red")

    def _validar_rango(self, v: int) -> bool:
        return MIN_VAL <= v <= MAX_VAL

    def _error_display(self, msg: str = "Fuera de rango (0–99)."):
        self.display_val.set("EE")
        self.enviar_serial("EE")
        messagebox.showwarning("Valor inválido", msg)

    def leer_operandos(self):
        """Lee operandos. Acepta vacío como memoria. Valida 0–99."""
        try:
            x = int(self.var_x.get()) if self.var_x.get() else self.memoria
            y = int(self.var_y.get()) if self.var_y.get() else self.memoria
            if not self._validar_rango(x) or not self._validar_rango(y):
                raise ValueError("Operandos fuera de rango (0–99).")
            return x, y
        except ValueError as e:
            self._error_display(str(e))
            return None, None

    def _mostrar_resultado(self, r: int):
        """Valida y muestra resultado en display; envía a ESP32 o EE."""
        if not self._validar_rango(r):
            self._error_display("Resultado fuera de rango (0–99).")
            return False
        self.display_val.set(str(r).zfill(2))
        self.enviar_serial(str(r))
        self.memoria = r
        return True

    def sumar(self):
        xy = self.leer_operandos()
        if xy:
            x, y = xy
            self._mostrar_resultado(x + y)

    def restar(self):
        xy = self.leer_operandos()
        if xy:
            x, y = xy
            self._mostrar_resultado(x - y)

    def multiplicar(self):
        xy = self.leer_operandos()
        if xy:
            x, y = xy
            self._mostrar_resultado(x * y)

    def dividir(self):
        xy = self.leer_operandos()
        if xy:
            x, y = xy
            if y == 0:
                self._error_display("No se puede dividir entre cero.")
                return
            self._mostrar_resultado(x // y)

if __name__ == "__main__":
    root = tk.Tk()
    app = CalculadoraESP32(root)
    root.mainloop()
    if ser and ser.is_open:
        ser.close()