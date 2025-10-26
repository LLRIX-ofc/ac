# Raspberry Pi Setup Instructions

## Prerequisites
- Raspberry Pi (any model with network connectivity)
- Raspberry Pi OS installed (Lite or Desktop)
- Internet connection
- SSH access or keyboard/monitor connected

## Step 1: Install Node.js

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js (using NodeSource repository for latest version)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 2: Install Git

```bash
sudo apt install -y git
```

## Step 3: Clone or Transfer Your Project

### Option A: Using Git (if your project is in a repository)
```bash
cd ~
git clone <your-repository-url>
cd <your-project-folder>
```

### Option B: Transfer files manually using SCP
From your computer, run:
```bash
scp -r /path/to/your/project pi@<raspberry-pi-ip>:~/tuya-homekit
```

Then SSH into the Pi and navigate to the folder:
```bash
ssh pi@<raspberry-pi-ip>
cd ~/tuya-homekit
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Configure Environment Variables

Make sure your `.env` file has all the correct values:
```bash
nano .env
```

Your `.env` should look like:
```
TUYA_ACCESS_ID=your_access_id
TUYA_ACCESS_SECRET=your_access_secret
TUYA_DEVICE_ID=your_device_id
HOMEKIT_USERNAME=CC:22:3D:E3:CE:30
HOMEKIT_PIN=031-45-154
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 6: Test the Application

```bash
npm start
```

You should see:
```
HomeKit AC Bridge is running on port 47129
Scan this code with your HomeKit app to pair:
    ┌────────────┐
    │ 031-45-154 │
    └────────────┘
```

If it works, press Ctrl+C to stop it.

## Step 7: Set Up Auto-Start with systemd

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/tuya-homekit.service
```

Paste the following (replace `pi` with your username and `/home/pi/tuya-homekit` with your actual project path):

```ini
[Unit]
Description=Tuya HomeKit Bridge
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/tuya-homekit
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 8: Enable and Start the Service

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable tuya-homekit.service

# Start the service now
sudo systemctl start tuya-homekit.service

# Check the status
sudo systemctl status tuya-homekit.service
```

## Step 9: View Logs

To see the logs from your running service:

```bash
# View recent logs
sudo journalctl -u tuya-homekit.service -n 50

# Follow logs in real-time
sudo journalctl -u tuya-homekit.service -f
```

## Useful Commands

```bash
# Stop the service
sudo systemctl stop tuya-homekit.service

# Restart the service
sudo systemctl restart tuya-homekit.service

# Disable auto-start
sudo systemctl disable tuya-homekit.service

# Check service status
sudo systemctl status tuya-homekit.service
```

## Troubleshooting

### Port Already in Use
If you get an error about port 47129 being in use:
```bash
# Find what's using the port
sudo lsof -i :47129

# Kill the process (replace PID with the actual process ID)
sudo kill -9 <PID>

# Restart the service
sudo systemctl restart tuya-homekit.service
```

### Cannot Connect to HomeKit
1. Make sure your iPhone/iPad is on the same network as the Raspberry Pi
2. Check that port 47129 is open on your router/firewall
3. Verify the Raspberry Pi has a stable network connection
4. Try restarting the service: `sudo systemctl restart tuya-homekit.service`

### Service Won't Start
Check the logs for errors:
```bash
sudo journalctl -u tuya-homekit.service -n 100
```

Common issues:
- Missing environment variables in `.env`
- Incorrect file paths in the service file
- Node.js not installed or wrong version
- Permission issues (make sure the user in the service file owns the project folder)

## Updating the Project

When you make changes:

```bash
# Stop the service
sudo systemctl stop tuya-homekit.service

# Pull latest changes (if using git)
git pull

# Or update files manually via SCP

# Restart the service
sudo systemctl start tuya-homekit.service
```
