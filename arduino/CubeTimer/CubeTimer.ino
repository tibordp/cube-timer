/*
  Cube Timer 1
*/

#include <U8g2lib.h>
#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>

#define BUTTON1 36
#define BUTTON2 39
#define BUTTON3 34
#define BUTTON4 35
#define TOUCHPAD 15
#define LED_1 17
#define LED_2 16

#define STATE_INITIAL 0
#define STATE_INSPECTION 10
#define STATE_INSPECTION_1 11
#define STATE_INSPECTION_2 12
#define STATE_SOLVING 20
#define STATE_SOLVING_1 21
#define STATE_SOLVED_1 30
#define STATE_SOLVED_2 31
#define STATE_ADJUST_INSPECTION 40
#define STATE_TOGGLE_INSPECTION_1 50
#define STATE_TOGGLE_INSPECTION_2 51
#define STATE_CALIBRATE_1 997
#define STATE_CALIBRATE_2 998
#define STATE_CALIBRATE_3 999

#define SOLVE_STATE_NONE 0
#define SOLVE_STATE_SOLVED 1
#define SOLVE_STATE_DNF 2
#define SOLVE_STATE_PLUS2 3

#define DEFAULT_TOUCHDOWN_THRESHOLD 25
#define DEFAULT_TOUCHUP_THRESHOLD 30

#define EXTENSION_1 15
#define EXTENSION_2 2
#define EXTENSION_3 0
#define EXTENSION_4 4

#define POT_1 32

#define SERVICE_UUID         "EB0E77C3-AF14-4B7F-AC80-D3631DC386AC"
#define CHARACTERISTIC_UUID  "EB0E77C3-AF14-4B7F-AC80-D3631DC386AD"


Preferences preferences;

BLECharacteristic *characteristic;

U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, 22, 21);

hw_timer_t * timer = NULL;

volatile long touchupThreshold = 0;
volatile long touchdownThreshold = 0;

volatile long stateChanged = true;
volatile bool durationChanged = true;

volatile long buttonPressedOn = 0;
volatile bool button1Pressed = false;
volatile bool button2Pressed = false;
volatile bool button3Pressed = false;
volatile bool button4Pressed = false;
volatile bool touchDetected = false;

volatile bool doInspection = false;

volatile long inspectionStarted = 0;
volatile long solvingStarted = 0;
volatile long solvingFinished = 0;

long potPosition = 0;
bool potChanged = false;
volatile long potScreenShown = 0;

volatile int epoch = 0;
volatile int state = 0;
volatile int solveState = 0;
volatile bool plus2DNFButtonPressed;
volatile int dnfButtonPressedOn;
volatile int configureButtonPressedOn;

volatile unsigned long calibrateHistogram[100];
volatile int lastTouchValue = 0;
volatile long lastTouchRead = 0;

int getInspectionLimit() {
  return (potPosition * 121) / (4096L * 32) * 1000;
}

struct __attribute__ ((packed)) CharacteristicValue {
  uint32_t state;
  uint32_t epoch;
  int32_t duration;
};

/*
  Touch sensor readings follow a bimodal distribution, with the two peaks around when
  the plate is not touched and the one where it is. This function takes the collected histogram
  and computes the touch-down and touch-up thresholds, at 1/3 and 2/3 of the difference between
  peaks respectively.
*/
void getCalibrationValues(int& touchDown, int& touchUp) {
  int minimum = 100;
  int maximum = 0;
  for (int i = 0; i < 100; ++i) {
    int value = calibrateHistogram[i];
    if (value != 0) {
      minimum = minimum < i ? minimum : i;
      maximum = maximum > i ? maximum : i;
    }
  }
  int midpoint = (minimum + maximum) / 2;
  unsigned long maxL = 0;
  for (int i = 0; i < midpoint; ++i) {
    int value = calibrateHistogram[i];
    if (value > maxL) {
      minimum = i;
      maxL = value;
    }
  }
  maxL = 0;
  for (int i = midpoint; i < 100; ++i) {
    int value = calibrateHistogram[i];
    if (value > maxL) {
      maximum = i;
      maxL = value;
    }
  }

  touchDown = (minimum*2 + maximum) / 3; 
  touchUp = (minimum + maximum*2) / 3; 
}

/*
  Bluetooth LE service is set up with a single characteristic, which notifies on the
  current internal state of the state machine (to see whether we are currently inspecting, solving)
  and the recorded time for each epoch. Epoch number is included in the characteristic
  value, to allow for further extension where we persist the times on the device (but also to distinguish a
  new result from one that was modified after the timer was stopped - e.g. DNF/+2)
*/
void setupBLE() {
  BLEDevice::init("CubeTimer"); // Give it a name
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  characteristic = pService->createCharacteristic(
                             CHARACTERISTIC_UUID,
                             BLECharacteristic::PROPERTY_READ   |
                             BLECharacteristic::PROPERTY_WRITE  |
                             BLECharacteristic::PROPERTY_NOTIFY |
                             BLECharacteristic::PROPERTY_INDICATE
                           );

  characteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
}

/*
  This is the main state machine that defines the user interaction. It is called from a timer each
  millisecond. Unfortunately it has to run in an ISR context rather than main loop, as updating the 
  display via I2C is really slow, so our recorded times could jitter by 10s of milliseconds.

  TODO: Figure out if display draw loop can run in a FreeRTOS task, so the state machine can run in the 
  main loop.
*/
void IRAM_ATTR stateMachine(long currentTime) {
  long inspectionLimit = getInspectionLimit();
  int currentState = state;

  // Callibration is accessible from any state
  if (state != STATE_CALIBRATE_1) {
    if (button4Pressed && !configureButtonPressedOn) {
      configureButtonPressedOn = currentTime;
    }
    if (button4Pressed && currentTime - configureButtonPressedOn > 2000) {
      for (int i = 0; i < 100; ++i) {
        calibrateHistogram[i] = 0;
      }
      state = STATE_CALIBRATE_1;
      return;
    }
    if (!button4Pressed) {
      configureButtonPressedOn = 0;
    }
  }

  switch (state) {
    case STATE_INITIAL:
      if (button1Pressed && !plus2DNFButtonPressed && solveState != SOLVE_STATE_NONE) {
        dnfButtonPressedOn = currentTime;
        solveState = solveState == SOLVE_STATE_DNF ? SOLVE_STATE_SOLVED : SOLVE_STATE_DNF;
        durationChanged = true;
        plus2DNFButtonPressed = true;
      }   
      if (button1Pressed && currentTime - dnfButtonPressedOn > 2000 && solveState != SOLVE_STATE_NONE) {
        solveState = SOLVE_STATE_NONE;
        durationChanged = true;
      }
      if (button2Pressed && !plus2DNFButtonPressed && solveState != SOLVE_STATE_NONE) {
        solveState = solveState == SOLVE_STATE_PLUS2 ? SOLVE_STATE_SOLVED : SOLVE_STATE_PLUS2;
        durationChanged = true;
        plus2DNFButtonPressed = true;
      }          
      if (plus2DNFButtonPressed && (!button1Pressed && !button2Pressed)) {
        plus2DNFButtonPressed = false;
      }
      if (button4Pressed) {
        potScreenShown = currentTime;
        state = STATE_TOGGLE_INSPECTION_1;
      }
      if (potChanged) {
        potScreenShown = currentTime;
        state = STATE_ADJUST_INSPECTION;
      }
      // Debounce starting the new epoch
      if (touchDetected && currentTime - solvingFinished > 200) {
        epoch++;
        solveState = SOLVE_STATE_NONE;
        
        if (inspectionLimit == 0) {
          solvingStarted = currentTime;
          state = STATE_SOLVING_1;
        } else if (doInspection) {
          inspectionStarted = currentTime;
          state = STATE_INSPECTION_1;
        } else if (!doInspection) {
          inspectionStarted = currentTime;
          state = STATE_INSPECTION;
        }
      }
      break;
    case STATE_INSPECTION_1:
      if (!touchDetected) {
        state = STATE_INSPECTION;
      } else if (inspectionLimit != 120 && currentTime - inspectionStarted >= inspectionLimit) {
        solvingStarted = currentTime;
        state = STATE_SOLVING_1;
      }
      break;
    case STATE_INSPECTION_2:
      if (!touchDetected) {
        solvingStarted = currentTime;
        state = STATE_SOLVING;
      } else if (inspectionLimit != 120 && currentTime - inspectionStarted >= inspectionLimit) {
        solvingStarted = currentTime;
        state = STATE_SOLVING_1;
      }
      break;
    case STATE_INSPECTION:
      if (!touchDetected && !doInspection) {
        solvingStarted = currentTime;
        state = STATE_SOLVING;
      } else if (touchDetected && doInspection) {
        state = STATE_INSPECTION_2;
      } else if (inspectionLimit != 120 && currentTime - inspectionStarted >= inspectionLimit) {
        solvingStarted = currentTime;
        state = STATE_SOLVING_1;
      }
      break;
    case STATE_SOLVING_1:
      if (!touchDetected) {
        state = STATE_SOLVING;
      }
      break;
    case STATE_SOLVING:
      if (touchDetected) {
        durationChanged = true;
        solveState = SOLVE_STATE_SOLVED;
        solvingFinished = currentTime;
        state = STATE_SOLVED_1;
      }
      break;
    case STATE_SOLVED_1:
      if (!touchDetected) {
        state = STATE_INITIAL;
      }
      break;
    case STATE_ADJUST_INSPECTION:
      if (potChanged) {
        potScreenShown = currentTime;
      }
      if (currentTime - potScreenShown > 1000) {
        state = STATE_INITIAL;
      }
      break;
    case STATE_TOGGLE_INSPECTION_1:
      if (!button4Pressed) {
        state = STATE_TOGGLE_INSPECTION_2;
      }
      break;
    case STATE_TOGGLE_INSPECTION_2:
      if (currentTime - potScreenShown > 1000) {
        state = STATE_INITIAL;
      }
      if (button4Pressed) {
        state = STATE_TOGGLE_INSPECTION_1;
        potScreenShown = currentTime;
        doInspection = !doInspection;
      }
      break;
    case STATE_CALIBRATE_1:
      if (!button4Pressed) {
        state = STATE_CALIBRATE_2;
      }
    case STATE_CALIBRATE_2:
      if (button1Pressed) {
        state = STATE_CALIBRATE_3;
      }      
      break;      
  }

  if (state != currentState) {
    stateChanged = true;
  }
}

void IRAM_ATTR onTimer() {
  long currentTime = millis();
  
  stateMachine(currentTime);
  if (touchDetected) {
    // There is no easy way to get an interrupt when the touch sensor value goes *above* some 
    // threshold, so we poll it here. This is not ideal, as touchRead is actually quite expensive
    // and if run in a tight loop in an ISR context, it will crash.
    if (touchRead(TOUCHPAD) > touchupThreshold) {
      touchDetected = false;
    }
  } if (state == STATE_CALIBRATE_2 && currentTime - lastTouchRead > 10) {
    
    int value = touchRead(TOUCHPAD);
    lastTouchValue = value;
    calibrateHistogram[value]++;
    lastTouchRead = currentTime;
  }
  potChanged = false;
}

void IRAM_ATTR onTouch() {
  touchDetected = true;
}

/*
  On ESP32, there doesn't seem to be an easy way to see whether an interrupt was triggered
  by a rising or falling edge, so we do some magic to check the buttons and debounce them.
*/
void IRAM_ATTR onButtonPress() {
  long currentTime = millis();
  bool button1Changed = digitalRead(BUTTON1) ^ button1Pressed;
  bool button2Changed = digitalRead(BUTTON2) ^ button2Pressed;
  bool button3Changed = digitalRead(BUTTON3) ^ button3Pressed;
  bool button4Changed = digitalRead(BUTTON4) ^ button4Pressed;

  if ((button1Changed || button2Changed || button3Changed || button4Changed) && (currentTime - buttonPressedOn > 10)) {
    button1Pressed = button1Changed ^ button1Pressed;
    button2Pressed = button2Changed ^ button2Pressed;
    button3Pressed = button3Changed ^ button3Pressed;
    button4Pressed = button4Changed ^ button4Pressed;
    buttonPressedOn = currentTime;
  }
}

/*
  Multi-sample the potentiometer value for greater good. 
  TODO: the 0.01uf capacitor between the pin and ground does help somewhat, but the signal
  is still very noisy.
*/
long readPotentiometer() {
  long result = 0;
  for (int i = 0; i < 32; ++i) {
    result += analogRead(POT_1);
  }
  return result;
}

/*
  Draw text on the center of the screen
*/
void drawBasic(const char* text, int yOffset = 0) {
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawUTF8(64 - u8g2.getUTF8Width(text) / 2, 32 - 5 + yOffset, text);
}

/*
  Draw DNF result
*/
void drawDNF() {
  u8g2.setFont(u8g2_font_fub20_tf);
  const char* text= "DNF";
  u8g2.drawUTF8(64 - u8g2.getUTF8Width(text) / 2, 32 - 10, text);
}

/*
  Draw time in a big font (while running & after the time is stopped)
*/
void drawTime(long timeMillis) {
  u8g2.setFont(u8g2_font_fub20_tf);
  char text[32];
  if (timeMillis > 60000) {
    sprintf(text, "%d:%02d.%02d", timeMillis / 60000, (timeMillis % 60000) / 1000, (timeMillis % 1000) / 10);
  } else {
    sprintf(text, "%d.%03d", timeMillis / 1000, timeMillis % 1000);
  }
  u8g2.drawUTF8(64 - u8g2.getUTF8Width(text) / 2, 32 - 10, text);
}

/*
  Draw inspection screen
*/
void drawInspection(long inspectionLimit, long timeMillis) {
  char text[32];
  if (inspectionLimit == 120000) {
    drawBasic("Start when ready!");
  } else {
    drawBasic("Start when ready!", -10);
    u8g2.setFont(u8g2_font_VCR_OSD_mf);
    // Round up
    sprintf(text, "%d", (inspectionLimit - timeMillis + 999) / 1000);
    u8g2.drawUTF8(64 - u8g2.getUTF8Width(text) / 2, 32, text);
  }
}

/*
  Draw inspection time adjustment screen (when potentiometer is turned)
*/
void drawInspectionChange(long timeMillis) {
  char text[32];
  drawBasic("Inspection length", -10);
  u8g2.setFont(u8g2_font_VCR_OSD_mf);
  if (timeMillis == 120000) {
    strcpy(text, "No limit!");
  } else {
    sprintf(text, "%d:%02d", timeMillis / 60000, (timeMillis / 1000) % 60);
  }
  u8g2.drawUTF8(64 - u8g2.getUTF8Width(text) / 2, 32, text);
}

/*
  Draw callibration screen
*/
void drawCalibration(int currentValue, int valueMin, int valueMax) {
  char text[32];
  drawBasic("Tap the sensor a", -22);
  drawBasic("few times", -12);
  
  sprintf(text, "Current value: %d", currentValue);
  u8g2.drawUTF8(64 - u8g2.getUTF8Width(text) / 2, 34, text);
  sprintf(text, "Touch-on: %d", valueMin);
  u8g2.drawUTF8(64 - u8g2.getUTF8Width(text) / 2, 44, text);
  sprintf(text, "Touch-off: %d", valueMax);
  u8g2.drawUTF8(64 - u8g2.getUTF8Width(text) / 2, 54, text);
}

/*
  Draw finished screen
*/
void drawFinished(long timeMillis, bool plus2 = false) {
  drawTime(timeMillis);
  drawBasic(plus2 ? "(+2\")" : "Great job!", 20);
}

/*
  Main draw routine. This fills the frame buffer based on the current state, but also
  controls other outputs (LEDs).
*/
void drawScreen(long currentTime) {
  u8g2.clearBuffer();
   
  digitalWrite(LED_1, LOW);
  digitalWrite(LED_2, LOW); 

  switch (state) {
    case STATE_INITIAL:
      switch (solveState) {
        case SOLVE_STATE_NONE:
          drawBasic("Touch the pad");
          u8g2.drawFrame(2, 2, 126, 60);
          break;
        case SOLVE_STATE_SOLVED:  
          drawFinished(solvingFinished - solvingStarted);
          break;
        case SOLVE_STATE_PLUS2:  
          drawFinished(solvingFinished - solvingStarted + 2000, true);
          break;          
        case SOLVE_STATE_DNF:  
          drawDNF();
          break;          
      }
      break;
    case STATE_INSPECTION:
    case STATE_INSPECTION_1:
    case STATE_INSPECTION_2:
      digitalWrite(LED_2, !doInspection || state == STATE_INSPECTION_2 ? HIGH : LOW);
      drawInspection(getInspectionLimit(), currentTime - inspectionStarted);
      break;
    case STATE_SOLVING:
    case STATE_SOLVING_1:
      digitalWrite(LED_1, HIGH);
      drawTime(currentTime - solvingStarted);
      break;
    case STATE_SOLVED_1:
      drawFinished(solvingFinished - solvingStarted);
      break;
    case STATE_ADJUST_INSPECTION:
      drawInspectionChange(getInspectionLimit());
      break;
    case STATE_TOGGLE_INSPECTION_1:
    case STATE_TOGGLE_INSPECTION_2:
      if (doInspection) {
        drawBasic("Inspection ON");
      } else {
        drawBasic("Inspection OFF");
      }
      break;
    case STATE_CALIBRATE_1:
    case STATE_CALIBRATE_2:
      {
        int minimum, maximum;
        getCalibrationValues(minimum, maximum);
        drawCalibration(lastTouchValue, minimum, maximum);
      }
      break;
    case STATE_CALIBRATE_3:   
      drawBasic("Saving calibration", -5);
      drawBasic("values...", +5);
      break;     
  }

  u8g2.sendBuffer();
}

void prepareDisplay() {
  u8g2.setBusClock(800000);
  u8g2.begin();
  u8g2.setFontRefHeightExtendedText();
  u8g2.setDrawColor(1);
  u8g2.setFontPosTop();
  u8g2.setFontDirection(0);
  drawBasic("Initializing...");
  u8g2.sendBuffer();
}

void setup() {
  pinMode(BUTTON1, INPUT);
  pinMode(BUTTON2, INPUT);
  pinMode(BUTTON3, INPUT);
  pinMode(BUTTON4, INPUT);
  pinMode(LED_1, OUTPUT);
  pinMode(LED_2, OUTPUT);

  Serial.begin(115200);

  prepareDisplay();
  preferences.begin("cube-timer", false);
  
  setupBLE();
  potPosition = readPotentiometer();

  touchdownThreshold = preferences.getUInt("touchdown_t", DEFAULT_TOUCHDOWN_THRESHOLD);
  touchupThreshold = preferences.getUInt("touchup_t", DEFAULT_TOUCHUP_THRESHOLD);

  timer = timerBegin(1, 80, true);
  timerAttachInterrupt(timer, &onTimer, true);
  timerAlarmWrite(timer, 1000, true);
  timerAlarmEnable(timer);
  touchAttachInterrupt(TOUCHPAD, onTouch, touchdownThreshold);

  attachInterrupt(BUTTON1, onButtonPress, CHANGE);
  attachInterrupt(BUTTON2, onButtonPress, CHANGE);
  attachInterrupt(BUTTON3, onButtonPress, CHANGE);
  attachInterrupt(BUTTON4, onButtonPress, CHANGE);
}

/*
  Broadcasts the state to a connected BLE server, if such exists.
*/
void broadcastViaBLE() {
  if (durationChanged || stateChanged) {
    CharacteristicValue cValue;
    cValue.state = state;
    cValue.epoch = epoch;
    cValue.duration = 0;
    switch (solveState) {
        case SOLVE_STATE_SOLVED:  
          cValue.duration = solvingFinished - solvingStarted;
          break;
        case SOLVE_STATE_PLUS2:  
          cValue.duration = solvingFinished - solvingStarted + 2000;
          break;          
        case SOLVE_STATE_DNF:  
          cValue.duration = -1;
          break;       
    }
    
    characteristic->setValue((uint8_t*)&cValue, sizeof(CharacteristicValue));
    characteristic->notify();
    durationChanged = false;
    stateChanged = false;
  }
}


void applyCalibrationSettings() {
  int minimum, maximum;
  getCalibrationValues(minimum, maximum);
  preferences.putUInt("touchdown_t", minimum);
  preferences.putUInt("touchup_t", maximum);  
  preferences.end();
  delay(500);
  ESP.restart();  
}

void loop() {
  long currentTime = millis();
  long currentPotPosition = readPotentiometer();

  if (abs(potPosition - currentPotPosition) > (state == STATE_ADJUST_INSPECTION ? 1024 : 3072)) {
    potPosition = currentPotPosition;
    potChanged = true;
  }

  broadcastViaBLE();
  if (state == STATE_CALIBRATE_3) {
    drawScreen(currentTime);
    applyCalibrationSettings(); 
  }

  drawScreen(currentTime);

  // Reset button states once per display loop in case some interrupts go wonky
  onButtonPress();
}
