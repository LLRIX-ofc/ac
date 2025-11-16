# Tuya AC HomeKit Bridge

This application creates a HomeKit bridge for your Tuya IR remote-controlled AC, allowing you to control it using Apple's Home app.

## Setup Instructions

### 1. Get Tuya API Credentials

1. Go to [Tuya IoT Platform](https://iot.tuya.com/)
2. Create a Cloud Project
3. Go to your project and get your Access ID and Access Secret
4. Link your Tuya Smart/Smart Life app account to the project
5. Get your AC device ID from the Devices page

### 2. Configure Environment Variables

Edit the `.env` file and add your Tuya credentials:

```
TUYA_ACCESS_ID=your_tuya_access_id_here
TUYA_ACCESS_SECRET=your_tuya_access_secret_here
TUYA_DEVICE_ID=your_ac_device_id_here
```

The HomeKit credentials are pre-configured:
- PIN: `031-45-154`
- Username: `CC:22:3D:E3:CE:30`

### 3. Run the Application

```bash
npm start
```

### 4. Add to HomeKit

1. Open the Home app on your iPhone/iPad
2. Tap the + button to add an accessory
3. Select "Add Accessory"
4. Choose "More options..." if your bridge doesn't appear automatically
5. Select "AC" from the list
6. Enter the PIN: `031-45-154`
7. Follow the on-screen instructions to complete setup

## Features

- **Power Toggle**: Toggle AC on/off using the Fan switch
- **Temperature Control**: Set target temperature (16-30°C) via thermostat
- **Fan Speed Cycling**: Cycle through fan speeds (1/2/3) using fan rotation speed
- **Mode Cycling**: Cycle through AC modes (0-4) using the Mode Cycle switch
- **Online Status Check**: Verifies device is online before sending commands
- **Status Sync**: Automatically syncs device state every 10 seconds using Tuya shadow properties
- **HomeKit Integration**: Full integration with Apple Home app

## HomeKit Controls

The AC appears in HomeKit with three main controls:

1. **Thermostat**:
   - View and set temperature (16-30°C)
   - Turn AC on/off via heating/cooling mode

2. **AC Fan**:
   - Toggle power on/off (acts as main power switch)
   - Adjust fan rotation speed to cycle through speeds 1, 2, and 3

3. **AC Mode Cycle**:
   - Toggle this switch to cycle through AC modes (0=Cool, 1=Heat, 2=Dry, 3=Fan, 4=Auto)
   - Switch automatically turns off after cycling

## IR Remote Commands

The app uses Tuya IR API with these commands:
- **PowerOn**: `action: "PowerOn", value: "PowerOn"`
- **PowerOff**: `action: "PowerOff", value: "PowerOff"`
- **Temperature**: `action: "T", value: <number 16-30>`
- **Fan Speed**: `action: "F", value: <number 1-3>`
- **Mode**: `action: "M", value: <number 0-4>`

## Troubleshooting

### Device Not Found in HomeKit
- Make sure the application is running
- Check that your iOS device is on the same network
- Try restarting the application
- Delete persist directory and restart if pairing fails

### Commands Not Working
- Verify your Tuya API credentials are correct
- Check that your device ID matches your AC in the Tuya app
- Ensure your Tuya project has API permissions enabled
- Verify you're using the EU endpoint (https://openapi.tuyaeu.com)

### Device Offline
- The app checks device online status before updating
- Ensure your IR remote is connected to the internet
- Check Tuya Smart Life app to verify device connectivity
