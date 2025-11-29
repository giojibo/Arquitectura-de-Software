// Pines del joystick
const int pinVRx = 34;
const int pinVRy = 35;
const int pinSW = 32;

// Pin del pulsador
const int pinBoton = 23;

void setup() {
  Serial.begin(115200);
  pinMode(pinSW, INPUT_PULLUP);
  pinMode(pinBoton, INPUT_PULLUP);
}

void loop() {
  int x = analogRead(pinVRx);        // Movimiento horizontal
  int y = analogRead(pinVRy);        // Movimiento vertical
  int sw = digitalRead(pinSW);       // Botón del joystick
  int boton = digitalRead(pinBoton); // Pulsador externo

  Serial.print("X:");
  Serial.print(x);
  Serial.print(" Y:");
  Serial.print(y);
  Serial.print(" SW:");
  Serial.print(sw == LOW ? "1" : "0");
  Serial.print(" BTN:");
  Serial.println(boton == LOW ? "1" : "0");

  delay(50);  // Delay corto para lectura fluida
}