#include <Arduino.h>

const int sensorPin = 12;
const int focoPin   = 22;
const int fanPin    = 23;

float temperaturaUmbral = 15.0;
bool modoAutomatico = true;

void setup() {
  Serial.begin(115200);
  pinMode(focoPin, OUTPUT);
  pinMode(fanPin, OUTPUT);
  digitalWrite(focoPin, HIGH);  // Apagado
  digitalWrite(fanPin, HIGH);   // Apagado
}

void loop() {
  int lectura = analogRead(sensorPin);
  float voltaje = lectura * (3.3 / 4095.0);  // LM35 alimentado con 3.3V
  float temperatura = voltaje * 100.0;

  Serial.println(temperatura);

  if (modoAutomatico) {
    if (temperatura < temperaturaUmbral) {
      digitalWrite(focoPin, LOW);   // Enciende foco
      digitalWrite(fanPin, HIGH);   // Apaga ventilador
    } else {
      digitalWrite(focoPin, HIGH);  // Apaga foco
      digitalWrite(fanPin, LOW);    // Enciende ventilador
    }
  }

  if (Serial.available()) {
    String comando = Serial.readStringUntil('\n');
    comando.trim();

    if (comando == "FOCO_ON") digitalWrite(focoPin, LOW);
    else if (comando == "FOCO_OFF") digitalWrite(focoPin, HIGH);
    else if (comando == "FAN_ON") digitalWrite(fanPin, LOW);
    else if (comando == "FAN_OFF") digitalWrite(fanPin, HIGH);
    else if (comando == "AUTO_ON") modoAutomatico = true;
    else if (comando == "AUTO_OFF") modoAutomatico = false;
    else if (comando.startsWith("UMBRAL=")) {
      temperaturaUmbral = comando.substring(7).toFloat();
    }
  }

  delay(1000);
}