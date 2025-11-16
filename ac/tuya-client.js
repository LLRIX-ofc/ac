const { TuyaContext } = require('@tuya/tuya-connector-nodejs');

class TuyaClient {
  constructor(accessId, accessSecret, baseUrl = 'https://openapi.tuyaeu.com') {
    this.context = new TuyaContext({
      baseUrl,
      accessKey: accessId,
      secretKey: accessSecret,
    });
  }

  async isDeviceOnline(deviceId) {
    try {
      const response = await this.context.request({
        path: `/v2.0/cloud/thing/${deviceId}`,
        method: 'GET',
      });

      if (response.success && response.result) {
        return response.result.is_online;
      }
      return false;
    } catch (error) {
      console.error('Error checking device online status:', error);
      return false;
    }
  }

  async getDeviceProperties(deviceId) {
    try {
      const response = await this.context.request({
        path: `/v2.0/cloud/thing/${deviceId}/shadow/properties`,
        method: 'GET',
        query: {
          codes: 'switch_power,fan,mode,temperature'
        }
      });

      if (response.success && response.result && response.result.properties) {
        const properties = {};
        response.result.properties.forEach(prop => {
          properties[prop.code] = prop.value;
        });
        return properties;
      }
      return null;
    } catch (error) {
      console.error('Error getting device properties:', error);
      return null;
    }
  }

  async sendCommand(deviceId, code, value) {
    try {
      const response = await this.context.request({
        path: `/v1.0/devices/${deviceId}/commands`,
        method: 'POST',
        body: {
          commands: [
            {
              code: code,
              value: value
            }
          ]
        },
      });

      if (response.success) {
        console.log(`Command sent: ${code} = ${value}`);
        return true;
      } else {
        console.error('Failed to send command:', response.msg);
        return false;
      }
    } catch (error) {
      console.error('Error sending command:', error);
      return false;
    }
  }

  async powerOn(deviceId) {
    return this.sendCommand(deviceId, 'PowerOn', 'PowerOn');
  }

  async powerOff(deviceId) {
    return this.sendCommand(deviceId, 'PowerOff', 'PowerOff');
  }

  async togglePower(deviceId, currentState) {
    if (currentState) {
      return this.powerOff(deviceId);
    } else {
      return this.powerOn(deviceId);
    }
  }

  async setTemperature(deviceId, temperature) {
    const temp = Math.max(16, Math.min(30, temperature));
    return this.sendCommand(deviceId, 'T', temp);
  }

  async increaseTemperature(deviceId, currentTemp) {
    const newTemp = Math.min(30, currentTemp + 1);
    return this.setTemperature(deviceId, newTemp);
  }

  async decreaseTemperature(deviceId, currentTemp) {
    const newTemp = Math.max(16, currentTemp - 1);
    return this.setTemperature(deviceId, newTemp);
  }

  async setFanSpeed(deviceId, speed) {
    const fanSpeed = Math.max(1, Math.min(3, speed));
    return this.sendCommand(deviceId, 'F', fanSpeed);
  }

  async cycleFanSpeed(deviceId, currentSpeed) {
    let newSpeed = currentSpeed + 1;
    if (newSpeed > 3) newSpeed = 1;
    return this.setFanSpeed(deviceId, newSpeed);
  }

  async setMode(deviceId, mode) {
    const acMode = Math.max(0, Math.min(4, mode));
    return this.sendCommand(deviceId, 'M', acMode);
  }

  async cycleMode(deviceId, currentMode) {
    let newMode = currentMode + 1;
    if (newMode > 4) newMode = 0;
    return this.setMode(deviceId, newMode);
  }
}

module.exports = TuyaClient;
