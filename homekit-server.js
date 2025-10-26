const hap = require('hap-nodejs');
const TuyaClient = require('./tuya-client');
require('dotenv').config();

const Accessory = hap.Accessory;
const Characteristic = hap.Characteristic;
const CharacteristicEventTypes = hap.CharacteristicEventTypes;
const Service = hap.Service;

const tuya = new TuyaClient(
  process.env.TUYA_ACCESS_ID,
  process.env.TUYA_ACCESS_SECRET
);

const deviceId = process.env.TUYA_DEVICE_ID;

const accessoryUuid = hap.uuid.generate('hap.tuya.ac.' + deviceId);
const accessory = new Accessory('AC', accessoryUuid);

const thermostat = accessory.addService(Service.Thermostat, 'AC');
const fanService = accessory.addService(Service.Fanv2, 'Fan Speed');
const powerSwitch = accessory.addService(Service.Switch, 'AC Power');

let currentState = {
  power: false,
  currentTemp: 20,
  targetTemp: 22,
  currentMode: Characteristic.CurrentHeatingCoolingState.OFF,
  targetMode: Characteristic.TargetHeatingCoolingState.OFF,
  fanSpeed: 1,
  mode: 0,
};

thermostat
  .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
  .on(CharacteristicEventTypes.GET, (callback) => {
    callback(null, currentState.currentMode);
  });

thermostat
  .getCharacteristic(Characteristic.TargetHeatingCoolingState)
  .setProps({
    validValues: [
      Characteristic.TargetHeatingCoolingState.COOL,
      Characteristic.TargetHeatingCoolingState.HEAT,
      Characteristic.TargetHeatingCoolingState.AUTO
    ]
  })
  .on(CharacteristicEventTypes.GET, (callback) => {
    callback(null, currentState.targetMode);
  })
  .on(CharacteristicEventTypes.SET, async (value, callback) => {
    let tuyaMode;
    if (value === Characteristic.TargetHeatingCoolingState.COOL) {
      tuyaMode = 0;
    } else if (value === Characteristic.TargetHeatingCoolingState.HEAT) {
      tuyaMode = 1;
    } else if (value === Characteristic.TargetHeatingCoolingState.AUTO) {
      tuyaMode = 4;
    }

    if (tuyaMode !== undefined) {
      if (!currentState.power) {
        await tuya.powerOn(deviceId);
        currentState.power = true;
      }
      await tuya.setMode(deviceId, tuyaMode);
      currentState.mode = tuyaMode;
      currentState.targetMode = value;
      currentState.currentMode = value;
      thermostat
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .updateValue(currentState.currentMode);
    }
    setTimeout(() => updateDeviceStatus(), 1000);
    callback(null);
  });

thermostat
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on(CharacteristicEventTypes.GET, (callback) => {
    callback(null, currentState.currentTemp);
  });

thermostat
  .getCharacteristic(Characteristic.TargetTemperature)
  .setProps({
    minValue: 16,
    maxValue: 30,
    minStep: 1,
  })
  .on(CharacteristicEventTypes.GET, (callback) => {
    callback(null, currentState.targetTemp);
  })
  .on(CharacteristicEventTypes.SET, async (value, callback) => {
    currentState.targetTemp = Math.round(value);
    await tuya.setTemperature(deviceId, currentState.targetTemp);
    setTimeout(() => updateDeviceStatus(), 1000);
    callback(null);
  });

thermostat
  .getCharacteristic(Characteristic.TemperatureDisplayUnits)
  .on(CharacteristicEventTypes.GET, (callback) => {
    callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
  });

fanService
  .getCharacteristic(Characteristic.Active)
  .on(CharacteristicEventTypes.GET, (callback) => {
    callback(null, currentState.power ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
  })
  .on(CharacteristicEventTypes.SET, async (value, callback) => {
    callback(null);
  });

fanService
  .getCharacteristic(Characteristic.RotationSpeed)
  .setProps({
    minValue: 0,
    maxValue: 100,
    minStep: 1,
  })
  .on(CharacteristicEventTypes.GET, (callback) => {
    const speedMap = {
      1: 0,
      2: 50,
      3: 100,
    };
    callback(null, speedMap[currentState.fanSpeed] || 0);
  })
  .on(CharacteristicEventTypes.SET, async (value, callback) => {
    let newSpeed;
    if (value <= 25) {
      newSpeed = 1;
    } else if (value <= 75) {
      newSpeed = 2;
    } else {
      newSpeed = 3;
    }

    if (newSpeed !== currentState.fanSpeed) {
      await tuya.setFanSpeed(deviceId, newSpeed);
      currentState.fanSpeed = newSpeed;

      const speedMap = {
        1: 0,
        2: 50,
        3: 100,
      };
      fanService
        .getCharacteristic(Characteristic.RotationSpeed)
        .updateValue(speedMap[newSpeed]);

      setTimeout(() => updateDeviceStatus(), 1000);
    }
    callback(null);
  });

powerSwitch
  .getCharacteristic(Characteristic.On)
  .on(CharacteristicEventTypes.GET, (callback) => {
    callback(null, currentState.power);
  })
  .on(CharacteristicEventTypes.SET, async (value, callback) => {
    if (value) {
      await tuya.powerOn(deviceId);
      currentState.power = true;
      currentState.currentMode = Characteristic.CurrentHeatingCoolingState.COOL;
      currentState.targetMode = Characteristic.TargetHeatingCoolingState.COOL;
    } else {
      await tuya.powerOff(deviceId);
      currentState.power = false;
      currentState.currentMode = Characteristic.CurrentHeatingCoolingState.OFF;
      currentState.targetMode = Characteristic.TargetHeatingCoolingState.OFF;
    }

    thermostat
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .updateValue(currentState.currentMode);
    thermostat
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .updateValue(currentState.targetMode);
    fanService
      .getCharacteristic(Characteristic.Active)
      .updateValue(currentState.power ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);

    setTimeout(() => updateDeviceStatus(), 1000);
    callback(null);
  });

async function updateDeviceStatus() {
  try {
    const isOnline = await tuya.isDeviceOnline(deviceId);
    if (!isOnline) {
      console.log('Device is offline');

      thermostat.getCharacteristic(Characteristic.StatusFault)
        .updateValue(Characteristic.StatusFault.GENERAL_FAULT);
      fanService.getCharacteristic(Characteristic.StatusFault)
        .updateValue(Characteristic.StatusFault.GENERAL_FAULT);
      powerSwitch.getCharacteristic(Characteristic.StatusFault)
        .updateValue(Characteristic.StatusFault.GENERAL_FAULT);

      return;
    }

    thermostat.getCharacteristic(Characteristic.StatusFault)
      .updateValue(Characteristic.StatusFault.NO_FAULT);
    fanService.getCharacteristic(Characteristic.StatusFault)
      .updateValue(Characteristic.StatusFault.NO_FAULT);
    powerSwitch.getCharacteristic(Characteristic.StatusFault)
      .updateValue(Characteristic.StatusFault.NO_FAULT);

    const properties = await tuya.getDeviceProperties(deviceId);
    if (properties) {
      if (properties.switch_power !== undefined) {
        currentState.power = properties.switch_power;

        if (properties.switch_power) {
          if (currentState.mode === 0) {
            currentState.currentMode = Characteristic.CurrentHeatingCoolingState.COOL;
            currentState.targetMode = Characteristic.TargetHeatingCoolingState.COOL;
          } else if (currentState.mode === 1) {
            currentState.currentMode = Characteristic.CurrentHeatingCoolingState.HEAT;
            currentState.targetMode = Characteristic.TargetHeatingCoolingState.HEAT;
          } else if (currentState.mode === 4) {
            currentState.currentMode = Characteristic.CurrentHeatingCoolingState.AUTO;
            currentState.targetMode = Characteristic.TargetHeatingCoolingState.AUTO;
          } else {
            currentState.currentMode = Characteristic.CurrentHeatingCoolingState.COOL;
            currentState.targetMode = Characteristic.TargetHeatingCoolingState.COOL;
          }
        } else {
          currentState.currentMode = Characteristic.CurrentHeatingCoolingState.OFF;
          currentState.targetMode = Characteristic.TargetHeatingCoolingState.OFF;
        }

        thermostat
          .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
          .updateValue(currentState.currentMode);
        thermostat
          .getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(currentState.targetMode);

        fanService
          .getCharacteristic(Characteristic.Active)
          .updateValue(currentState.power ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);

        powerSwitch
          .getCharacteristic(Characteristic.On)
          .updateValue(currentState.power);
      }

      if (properties.temperature !== undefined) {
        currentState.targetTemp = properties.temperature;
        currentState.currentTemp = properties.temperature;
        thermostat
          .getCharacteristic(Characteristic.TargetTemperature)
          .updateValue(currentState.targetTemp);
        thermostat
          .getCharacteristic(Characteristic.CurrentTemperature)
          .updateValue(currentState.currentTemp);
      }

      if (properties.fan !== undefined) {
        currentState.fanSpeed = properties.fan;
        const speedMap = {
          1: 0,
          2: 50,
          3: 100,
        };
        fanService
          .getCharacteristic(Characteristic.RotationSpeed)
          .updateValue(speedMap[currentState.fanSpeed] || 0);
      }

      if (properties.mode !== undefined) {
        currentState.mode = properties.mode;
        let homekitMode;
        if (properties.mode === 0) {
          homekitMode = Characteristic.TargetHeatingCoolingState.COOL;
        } else if (properties.mode === 1) {
          homekitMode = Characteristic.TargetHeatingCoolingState.HEAT;
        } else if (properties.mode === 4) {
          homekitMode = Characteristic.TargetHeatingCoolingState.AUTO;
        }
        if (homekitMode !== undefined && currentState.power) {
          currentState.targetMode = homekitMode;
          currentState.currentMode = homekitMode;
          thermostat.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(homekitMode);
          thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(homekitMode);
        }
      }

      console.log('Device status updated:', {
        power: currentState.power,
        temp: currentState.targetTemp,
        fan: currentState.fanSpeed,
        mode: currentState.mode
      });
    }
  } catch (error) {
    console.error('Error updating device status:', error);
  }
}

accessory.getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, 'Tuya')
  .setCharacteristic(Characteristic.Model, 'IR AC Remote')
  .setCharacteristic(Characteristic.SerialNumber, deviceId);

accessory.on('identify', (paired, callback) => {
  console.log('AC Accessory identified');
  callback();
});

const username = process.env.HOMEKIT_USERNAME;
const pincode = process.env.HOMEKIT_PIN;
const port = 65535;

accessory.publish({
  username: username,
  pincode: pincode,
  port: port,
  category: hap.Categories.AIR_CONDITIONER,
});

console.log('HomeKit AC Bridge is running on port', port);
console.log('Scan this code with your HomeKit app to pair:');
console.log('');
console.log('    ┌────────────┐');
console.log('    │ ' + pincode + ' │');
console.log('    └────────────┘');
console.log('');

updateDeviceStatus();
setInterval(updateDeviceStatus, 10000);

module.exports = accessory;
