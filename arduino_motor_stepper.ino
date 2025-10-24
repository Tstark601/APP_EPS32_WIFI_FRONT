#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Keypad.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>

// ================== CONFIGURACIÓN WIFI ==================
const char* ssid = "FMLA ACOSTA_EXT";
const char* password = "Acost@333";
const char* API_HOST = "192.168.1.120";
const uint16_t API_PORT = 8000;
const String API_BASE = String("http://") + API_HOST + ":" + String(API_PORT);

// ================== GLOBAL ==================
WebSocketsClient webSocket;
LiquidCrystal_I2C lcd(0x27, 16, 2);

String tokenActual = "";
String userName = "";
bool logeado = false;

// ================== TECLADO ==================
const byte rowsCount = 4;
const byte columsCount = 4;
char keys[rowsCount][columsCount] = {
  { '1','2','3','A' },
  { '4','5','6','B' },
  { '7','8','9','C' },
  { '*','0','#','D' }
};
byte rowPins[rowsCount] = { 5, 18, 19, 21 };
byte columnPins[columsCount] = { 3, 1, 22, 23 };
Keypad keypad = Keypad(makeKeymap(keys), rowPins, columnPins, rowsCount, columsCount);

// ================== PINES ==================
int ledPin1 = 25;
int ledPin3 = 33;
int ledPin4 = 32;
int ledPin5 = 23;

int buttonPin1 = 34;
int buttonPin3_izquierda = 15;
int buttonPin4_derecha = 2;

// ================== MOTOR ==================
#define IN1 13
#define IN2 12
#define IN3 14
#define IN4 27

const int pasoSecuencia[8][4] = {
  {1, 0, 0, 0},
  {1, 1, 0, 0},
  {0, 1, 0, 0},
  {0, 1, 1, 0},
  {0, 0, 1, 0},
  {0, 0, 1, 1},
  {0, 0, 0, 1},
  {1, 0, 0, 1}
};

// ================== VARIABLES ==================
int pasoActual = 0;
int pasosPorVuelta = 4096;
int retardoMotor = 1;
bool motorGirando = false;
bool direccionMotor = true;
int pasosRestantes = 0;
unsigned long previousMotorTime = 0;
unsigned long previousDebounceTime = 0;
const unsigned long debounceDelay = 50;
int porcentajeActual = 0;

int ledState1 = 0;
int buttonOld1 = 1;
int buttonOld3 = 1;
int buttonOld4 = 1;

int menuNivel = 0; // 0 = principal, 1 = LED, 2 = MOTOR
bool loginManualActivo = false;
String inputUsuario = "";
String inputClave = "";
bool ingresandoUsuario = true;

// ================== PROTOTIPOS ==================
bool loginESP32(String username, String password);
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
bool verificarConexionBackend();
void enviarAccionBackend(String tipoAccion);
void mostrarMenuPrincipal();
void mostrarMenuLED();
void mostrarMenuMotor();
void procesarTeclado(char key);
void iniciarGiroMotor(bool dir);
void pararMotor();
void ejecutarPaso(bool dir);
void delayWithWebSocket(unsigned long ms);
void procesarLoginManual(char key);
void mostrarMenuLogin();
void toggleLed1();
void mostrarPantallaMotor(bool direccion);
void actualizarPorcentajeEnPantalla();
void reconectarWebSocket();

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);
  Wire.begin(26, 4);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Pines
  pinMode(ledPin1, OUTPUT);
  pinMode(ledPin3, OUTPUT);
  pinMode(ledPin4, OUTPUT);
  pinMode(ledPin5, OUTPUT);
  pinMode(buttonPin1, INPUT_PULLUP);
  pinMode(buttonPin3_izquierda, INPUT_PULLUP);
  pinMode(buttonPin4_derecha, INPUT_PULLUP);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  digitalWrite(ledPin1, LOW);
  digitalWrite(ledPin3, LOW);
  digitalWrite(ledPin5, LOW);
  digitalWrite(ledPin4, HIGH);

  // ================== CONEXIÓN WIFI ==================
  lcd.setCursor(0, 0);
  lcd.print("Conectando WiFi");
  WiFi.begin(ssid, password);
  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(500);
    lcd.print(".");
    Serial.print(".");
  }

  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcd.print("WIFI NO CONECTADO");
    Serial.println("\n[ERROR] No se pudo conectar al WiFi");
    while (true);
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi OK");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  Serial.println("\n[OK] WiFi conectado con IP: " + WiFi.localIP().toString());
  delay(2000);

  // ================== VALIDAR BACKEND ==================
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Verificando API...");
  Serial.println("[INFO] Verificando API...");

  if (verificarConexionBackend()) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SISTEMA CONECTADO");
    lcd.setCursor(0, 1);
    lcd.print("CON API");
    Serial.println("[OK] SISTEMA CONECTADO CON API");
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SISTEMA NO");
    lcd.setCursor(0, 1);
    lcd.print("CONECTADO CON API");
    Serial.println("[WARN] SISTEMA NO CONECTADO CON API");
  }

  delay(3000);

  // ================== WEBSOCKET MEJORADO ==================
  webSocket.begin(API_HOST, API_PORT, "/ws/device/1");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);  // Reconectar cada 3 segundos
  webSocket.enableHeartbeat(15000, 3000, 2);  // Heartbeat para mantener conexión
  
  Serial.println("[WS] 🔄 Iniciando WebSocket...");

  mostrarMenuLogin();
}

// ================== LOOP ==================
void loop() {
  webSocket.loop();
  
  // Verificar periodicamente si estamos conectados
  static unsigned long lastConnectionCheck = 0;
  if (millis() - lastConnectionCheck > 10000) { // Cada 10 segundos
    lastConnectionCheck = millis();
    if (!webSocket.isConnected()) {
      Serial.println("[WS] ⚠️ WebSocket desconectado, intentando reconectar...");
    }
  }
  
  unsigned long currentTime = millis();

  if (!logeado) {
    char key = keypad.getKey();
    if (key) {
      procesarLoginManual(key);
    }
  } else {
    // Usuario logeado - procesar teclado y botones
    char key = keypad.getKey();
    if (key) procesarTeclado(key);

    if (currentTime - previousDebounceTime >= debounceDelay) {
      previousDebounceTime = currentTime;
      int buttonNew1 = digitalRead(buttonPin1);
      int buttonNew3 = digitalRead(buttonPin3_izquierda);
      int buttonNew4 = digitalRead(buttonPin4_derecha);

      if (buttonNew3 == LOW && buttonOld3 == HIGH) {
        if (motorGirando && !direccionMotor) { 
          pararMotor(); 
          mostrarMenuPrincipal(); 
        } else { 
          iniciarGiroMotor(false); 
          mostrarPantallaMotor(false); 
        }
      }

      if (buttonNew4 == LOW && buttonOld4 == HIGH) {
        if (motorGirando && direccionMotor) { 
          pararMotor(); 
          mostrarMenuPrincipal(); 
        } else { 
          iniciarGiroMotor(true); 
          mostrarPantallaMotor(true); 
        }
      }

      if (buttonNew1 == LOW && buttonOld1 == HIGH) toggleLed1();

      buttonOld1 = buttonNew1;
      buttonOld3 = buttonNew3;
      buttonOld4 = buttonNew4;
    }

    if (motorGirando && currentTime - previousMotorTime >= retardoMotor) {
      previousMotorTime = currentTime;
      ejecutarPaso(direccionMotor);
      pasosRestantes--;
      int nuevoPorcentaje = 100 - (pasosRestantes * 100 / pasosPorVuelta);
      if (nuevoPorcentaje >= porcentajeActual + 5 || pasosRestantes <= 0) {
        porcentajeActual = nuevoPorcentaje;
        actualizarPorcentajeEnPantalla();
      }
      if (pasosRestantes <= 0) {
        pararMotor();
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Giro Completo!");
        delay(2000);
        mostrarMenuPrincipal();
      }
    }
  }
}

// ================== WEBSOCKET MEJORADO ==================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] 🔌 Desconectado");
      // Intentar reconectar automáticamente
      webSocket.begin(API_HOST, API_PORT, "/ws/device/1");
      webSocket.onEvent(webSocketEvent);
      break;
      
    case WStype_CONNECTED:
      Serial.println("[WS] ✅ Conectado al servidor");
      // Enviar autenticación si ya tenemos token
      if (tokenActual != "") {
        String authMsg = "{\"type\":\"auth\",\"token\":\"" + tokenActual + "\"}";
        webSocket.sendTXT(authMsg);
        Serial.println("[WS] 🔐 Enviando autenticación: " + authMsg);
      }
      break;
      
    case WStype_TEXT: {
      Serial.printf("[WS] 📩 Mensaje recibido: %s\n", payload);
      
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, payload, length);
      
      if (error) {
        Serial.println("[WS] ❌ Error parse JSON");
        return;
      }
      
      String tipo = doc["type"] | "";
      String event = doc["event"] | "";

      // 🔥 CAPTURAR LOGIN DESDE LA APP - MÚLTIPLES FORMATOS
      if (tipo == "login" || tipo == "auth_success") {
        bool success = doc["success"] | false;
        String message = doc["message"] | "";
        
        Serial.printf("[WS] 🔑 Login event: success=%d, message=%s\n", success, message.c_str());
        
        if (success) {
          // Obtener token si viene en el mensaje
          if (doc.containsKey("token")) {
            tokenActual = doc["token"].as<String>();
            Serial.println("[WS] 🔑 Token actualizado: " + tokenActual);
          }
          
          // Obtener información del usuario
          if (doc.containsKey("user")) {
            JsonObject user = doc["user"];
            if (user.containsKey("name")) {
              userName = user["name"].as<String>();
            } else if (user.containsKey("username")) {
              userName = user["username"].as<String>();
            }
          } else if (doc.containsKey("name")) {
            userName = doc["name"].as<String>();
          }
          
          logeado = true;
          
          // Mostrar en pantalla
          lcd.clear(); 
          lcd.print("✅ Login App OK");
          delayWithWebSocket(1000);
          lcd.clear(); 
          lcd.print("Bienvenido:");
          lcd.setCursor(0,1); 
          lcd.print(userName);
          delayWithWebSocket(2000);
          mostrarMenuPrincipal();
          
          Serial.println("[WS] ✅ Login exitoso desde app - Usuario: " + userName);
        }
      }
      // Manejar notificación de nuevo login
      else if (event == "user_logged_in" || tipo == "user_authenticated") {
        Serial.println("[WS] 👤 Notificación de login recibida");
        
        if (doc.containsKey("user_id")) {
          // Si recibimos un user_id, asumimos que el login fue exitoso
          logeado = true;
          if (doc.containsKey("username")) {
            userName = doc["username"].as<String>();
          }
          
          lcd.clear(); 
          lcd.print("✅ Sesion Activa");
          delayWithWebSocket(1000);
          mostrarMenuPrincipal();
        }
      }
      // Manejar acciones desde el backend
      else if (event == "new_action" || tipo == "action" || tipo == "action_execute") {
        int actionId = doc["action_id"] | doc["id"] | 0;
        String actionType = doc["action_type"] | doc["type"] | "";
        String command = doc["command"] | "";
        
        Serial.printf("[WS] ⚡ Acción recibida: %s (ID:%d)\n", actionType.c_str(), actionId);
        
        if (actionType == "LED_ON" || command == "LED_ON") {
          digitalWrite(ledPin1, HIGH);
          ledState1 = 1;
          lcd.clear(); lcd.print("LED ENCENDIDO");
          delayWithWebSocket(1000);
          mostrarMenuPrincipal();
        }
        else if (actionType == "LED_OFF" || command == "LED_OFF") {
          digitalWrite(ledPin1, LOW);
          ledState1 = 0;
          lcd.clear(); lcd.print("LED APAGADO");
          delayWithWebSocket(1000);
          mostrarMenuPrincipal();
        }
        else if (actionType == "MOTOR_IZQ" || command == "MOTOR_IZQ") {
          iniciarGiroMotor(false);
          mostrarPantallaMotor(false);
        }
        else if (actionType == "MOTOR_DER" || command == "MOTOR_DER") {
          iniciarGiroMotor(true);
          mostrarPantallaMotor(true);
        }
        else if (actionType == "MOTOR_STOP" || command == "MOTOR_STOP") {
          pararMotor();
          mostrarMenuPrincipal();
        }
      }
      // Mensaje genérico de conexión
      else if (tipo == "connection" || tipo == "info") {
        String msg = doc["message"] | "";
        Serial.println("[WS] ℹ️ Mensaje del servidor: " + msg);
      }
      break;
    }
    
    case WStype_ERROR:
      Serial.println("[WS] ❌ Error en WebSocket");
      break;
      
    default:
      break;
  }
}

// ================== BACKEND ==================
bool verificarConexionBackend() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = API_BASE + "/health";
    http.begin(url);
    int code = http.GET();
    Serial.printf("[HEALTH] HTTP code: %d\n", code);
    if (code == 200) {
      String payload = http.getString();
      Serial.println("[HEALTH] payload: " + payload);
    }
    http.end();
    return (code == 200);
  }
  return false;
}

bool loginESP32(String username, String password) {
  if (WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  String url = API_BASE + "/api/auth/login";
  Serial.println("[LOGIN] URL: " + url);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String body = "username=" + username + "&password=" + password;
  Serial.println("[LOGIN] Body: " + body);

  int code = http.POST(body);
  Serial.printf("[LOGIN] HTTP %d\n", code);

  if (code == 200) {
    String resp = http.getString();
    Serial.println("[LOGIN] Respuesta: " + resp);
    
    StaticJsonDocument<512> response;
    DeserializationError err = deserializeJson(response, resp);
    if (err) { 
      Serial.println("[LOGIN] JSON parse error"); 
      http.end(); 
      return false; 
    }
    
    tokenActual = response["access_token"].as<String>();
    
    // Obtener nombre del usuario
    if (response.containsKey("user")) {
      if (response["user"].containsKey("name")) {
        userName = response["user"]["name"].as<String>();
      } else if (response["user"].containsKey("username")) {
        userName = response["user"]["username"].as<String>();
      }
    } else {
      userName = username;
    }
    
    logeado = true;
    
    // 🔥 NOTIFICAR AL WEBSOCKET DEL LOGIN EXITOSO
    if (webSocket.isConnected()) {
      String authMsg = "{\"type\":\"auth\",\"token\":\"" + tokenActual + "\"}";
      webSocket.sendTXT(authMsg);
      Serial.println("[LOGIN] 🔐 Autenticación enviada al WebSocket");
    }
    
    http.end();
    return true;
  } else {
    Serial.printf("[LOGIN] Error %d\n", code);
    String errorResp = http.getString();
    Serial.println("[LOGIN] Error respuesta: " + errorResp);
    http.end();
    return false;
  }
}

void enviarAccionBackend(String tipoAccion) {
  if (!logeado || tokenActual == "") {
    Serial.println("[ACTION] No logeado, ignorando acción");
    return;
  }

  HTTPClient http;
  String url = API_BASE + "/actions/";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + tokenActual);

  StaticJsonDocument<256> doc;
  doc["id_device"] = 1;
  doc["action"] = tipoAccion;  // ✅ CAMBIO: de "action_name" a "action"
  String body; 
  serializeJson(doc, body);

  Serial.println("[ACTION] Enviando: " + body);

  int code = http.POST(body);
  Serial.printf("[ACTION] HTTP Code: %d\n", code);
  
  if (code == 200 || code == 201) {
    String resp = http.getString();
    Serial.println("[ACTION] Respuesta: " + resp);
  } else {
    String error = http.getString();
    Serial.println("[ACTION] Error: " + error);
    Serial.println("[ACTION] Body enviado: " + body);  // Para debugging
  }
  
  http.end();
}

// ================== FUNCIONES DE VISUALIZACIÓN ==================
void mostrarPantallaMotor(bool direccion) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(direccion ? "Giro Derecha" : "Giro Izquierda");
  lcd.setCursor(0, 1);
  lcd.print("Avance: 0%");
  porcentajeActual = 0;
}

void actualizarPorcentajeEnPantalla() {
  lcd.setCursor(8, 1);
  lcd.print(porcentajeActual);
  lcd.print("%   ");
}

void mostrarMenuPrincipal() {
  menuNivel = 0;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SELECT OPTION");
  lcd.setCursor(0, 1);
  lcd.print("1.LED 2.MOTOR");
}

void mostrarMenuLED() {
  menuNivel = 1;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LED MENU");
  lcd.setCursor(0, 1);
  lcd.print("1=ON 2=OFF *=BACK");
}

void mostrarMenuMotor() {
  menuNivel = 2;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("MOTOR MENU");
  lcd.setCursor(0, 1);
  lcd.print("1.<= 2.STOP 3.=>");
}

void mostrarMenuLogin() {
  lcd.clear();
  lcd.print("LOGIN OPCIONES:");
  lcd.setCursor(0,1);
  lcd.print("1=Manual, wait API");
  loginManualActivo = false;
  userName = "";
  logeado = false;
}

// ================== TECLADO ==================
void procesarTeclado(char key) {
  switch (menuNivel) {
    case 0:
      if (key == '1') mostrarMenuLED();
      else if (key == '2') mostrarMenuMotor();
      break;
    case 1:
      if (key == '1') { 
        digitalWrite(ledPin1, HIGH); 
        ledState1 = 1; 
        enviarAccionBackend("LED_ON");
        lcd.setCursor(0, 0); 
        lcd.print("LED ENCENDIDO "); 
      }
      else if (key == '2') { 
        digitalWrite(ledPin1, LOW); 
        ledState1 = 0; 
        enviarAccionBackend("LED_OFF");
        lcd.setCursor(0, 0); 
        lcd.print("LED APAGADO "); 
      }
      else if (key == '*') mostrarMenuPrincipal();
      break;
    case 2:
      if (key == '1') { 
        iniciarGiroMotor(false); 
        mostrarPantallaMotor(false); 
        enviarAccionBackend("MOTOR_IZQ");
      }
      else if (key == '2') { 
        pararMotor(); 
        enviarAccionBackend("MOTOR_STOP");
        lcd.clear(); 
        lcd.setCursor(0, 0); 
        lcd.print("Motor Detenido "); 
        lcd.setCursor(0, 1); 
        lcd.print("1.<= 2.STOP 3.=>"); 
      }
      else if (key == '3') { 
        iniciarGiroMotor(true); 
        mostrarPantallaMotor(true); 
        enviarAccionBackend("MOTOR_DER");
      }
      else if (key == '*') { 
        pararMotor(); 
        mostrarMenuPrincipal(); 
      }
      break;
  }
}

// ================== LOGIN MANUAL ==================
void procesarLoginManual(char key) {
  static String username = "";
  static String password = "";
  static bool ingresandoUsuario = true;

  if (key == '1' && !loginManualActivo) {
    loginManualActivo = true;
    username = "";
    password = "";
    ingresandoUsuario = true;
    lcd.clear(); 
    lcd.print("Usuario:"); 
    lcd.setCursor(0,1);
    return;
  }

  if (key == '*') {
    username = ""; 
    password = ""; 
    ingresandoUsuario = true;
    loginManualActivo = false;
    mostrarMenuLogin();
    return;
  }

  if (!loginManualActivo) return;

  if (key == '#') {
    if (ingresandoUsuario) {
      ingresandoUsuario = false;
      lcd.clear(); 
      lcd.print("Clave:"); 
      lcd.setCursor(0,1);
      return;
    } else {
      lcd.clear(); 
      lcd.print("Autenticando...");
      bool ok = loginESP32(username, password);
      if (ok) {
        lcd.clear(); 
        lcd.print("Login exitoso");
        delayWithWebSocket(800);
        lcd.clear(); 
        lcd.print("Bienvenido:");
        lcd.setCursor(0,1);
        lcd.print(userName);
        delayWithWebSocket(1500);
        lcd.clear(); 
        lcd.print("SISTEMA CONTROL");
        lcd.setCursor(0,1); 
        lcd.print("LED Y MOTOR");
        delayWithWebSocket(4000);
        mostrarMenuPrincipal();
      } else {
        lcd.clear(); 
        lcd.print("Login incorrecto");
        delayWithWebSocket(1500);
        mostrarMenuLogin();
      }
      username = ""; 
      password = ""; 
      ingresandoUsuario = true; 
      loginManualActivo = false;
      return;
    }
  }

  if (ingresandoUsuario) {
    username += key;
    lcd.setCursor(0,1);
    lcd.print(username);
  } else {
    password += key;
    lcd.setCursor(0,1);
    lcd.print(String(password.length(), '*'));
  }
}

// ================== LED ==================
void toggleLed1() {
  ledState1 = !ledState1;
  digitalWrite(ledPin1, ledState1);
  enviarAccionBackend(ledState1 ? "LED_ON" : "LED_OFF");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LED 1: ");
  lcd.print(ledState1 ? "ON" : "OFF");
  delay(1500);
  mostrarMenuPrincipal();
}

// ================== MOTOR ==================
void iniciarGiroMotor(bool direccion) {
  motorGirando = true;
  direccionMotor = direccion;
  pasosRestantes = pasosPorVuelta;
  porcentajeActual = 0;
  digitalWrite(ledPin4, LOW);
  digitalWrite(direccion ? ledPin5 : ledPin3, HIGH);
  digitalWrite(direccion ? ledPin3 : ledPin5, LOW);
}

void pararMotor() {
  motorGirando = false;
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  digitalWrite(ledPin3, LOW);
  digitalWrite(ledPin5, LOW);
  digitalWrite(ledPin4, HIGH);
}

void ejecutarPaso(bool direccion) {
  pasoActual = (direccion) ? (pasoActual + 1) % 8 : (pasoActual + 7) % 8;
  digitalWrite(IN1, pasoSecuencia[pasoActual][0]);
  digitalWrite(IN2, pasoSecuencia[pasoActual][1]);
  digitalWrite(IN3, pasoSecuencia[pasoActual][2]);
  digitalWrite(IN4, pasoSecuencia[pasoActual][3]);
}

void delayWithWebSocket(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    webSocket.loop();
    delay(10);
  }
}

void reconectarWebSocket() {
  Serial.println("[WS] 🔄 Reconectando WebSocket...");
  webSocket.disconnect();
  delay(1000);
  webSocket.begin(API_HOST, API_PORT, "/ws/device/1");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
}