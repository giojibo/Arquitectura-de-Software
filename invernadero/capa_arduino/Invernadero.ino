// Pines de segmentos
int D1[7] = {13, 14, 27, 32, 16, 33, 17}; // Decenas
int D0[7] = {23, 22, 21, 19, 18, 4, 5};   // Unidades

// Pin del sensor
const int sensorPin = 34;

// Mapa de segmentos para dígitos 0–9
bool digitos[10][7] = {
  {1,1,1,1,1,1,0}, // 0
  {0,1,1,0,0,0,0}, // 1
  {1,1,0,1,1,0,1}, // 2
  {1,1,1,1,0,0,1}, // 3
  {0,1,1,0,0,1,1}, // 4
  {1,0,1,1,0,1,1}, // 5
  {1,0,1,1,1,1,1}, // 6
  {1,1,1,0,0,0,0}, // 7
  {1,1,1,1,1,1,1}, // 8
  {1,1,1,1,0,1,1}  // 9
};

void mostrarDigito(int valor, int* pines) {
  for (int i = 0; i < 7; i++) {
    digitalWrite(pines[i], digitos[valor][i]);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(sensorPin, INPUT);

  for (int i = 0; i < 7; i++) {
    pinMode(D1[i], OUTPUT);
    pinMode(D0[i], OUTPUT);
    digitalWrite(D1[i], LOW);
    digitalWrite(D0[i], LOW);
  }
}

void loop() {
  // Leer sensor analógico
  int lectura = analogRead(sensorPin);
  float voltaje = lectura * (5.0 / 4095.0);
  int temperatura = (int)(voltaje * 100.0);  // ← Ajusta según tu sensor

  // Limitar a rango 0–99
  temperatura = constrain(temperatura, 0, 99);

  // Mostrar en display
  int decenas = temperatura / 10;
  int unidades = temperatura % 10;

  mostrarDigito(decenas, D1);
  mostrarDigito(unidades, D0);

  // Opcional: imprimir por Serial
  Serial.println("Temp: " + String(temperatura));

  delay(500);
}