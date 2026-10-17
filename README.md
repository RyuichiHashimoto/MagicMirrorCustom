# **MagicMirror²**

is an open source modular smart mirror platform. This project packs MagicMirror into a docker image.

You find the [documentation here](https://khassel.gitlab.io/magicmirror/).

## Local Docker startup

Start MagicMirror in server mode with Docker Compose:

```bash
cd ./run
docker compose up -d
```

Open the mirror in a browser:

```text
http://localhost:18089
```

### Google Calendar schedule

`MMM-Schedule` reads a Google Calendar private iCal feed only in its server-side
helper. Install its dependency once, then configure the secret URL:

```bash
cd mounts/modules/MMM-Schedule
npm install --omit=dev
cd ../../../run
# For a new setup only; preserve an existing run/.env file.
cp .env.example .env
```

Edit `run/.env` and set `GOOGLE_CALENDAR_ICAL_URL` to the calendar's **Secret
address in iCal format**, then restart MagicMirror. The URL is passed only to the
MagicMirror server process and is never included in browser configuration or
socket notifications. `run/.env` and other `.env` files are ignored by Git.

### Weather location

`MMM-OpenMeteoWeather` reads its forecast coordinates on the server side. Set
`WEATHER_LATITUDE` and `WEATHER_LONGITUDE` in `run/.env`, then restart
MagicMirror. The coordinates are not included in browser configuration or
socket notifications.

Stop it with:

```bash
cd ./run
docker compose down
```

## Kiosk autostart

This setup opens Chromium automatically after the desktop session starts and shows MagicMirror in fullscreen kiosk mode.

### Prerequisites

1. MagicMirror starts successfully with Docker Compose.

   ```bash
   cd ./run
   docker compose up -d
   curl -I http://localhost:18089
   ```

   `HTTP/1.1 200 OK` means MagicMirror is reachable.

2. Docker starts on boot.

   ```bash
   sudo systemctl enable docker
   ```

3. Chromium is installed and the command path is correct.

   ```bash
   ls /usr/bin/chromium-browser
   ```

   If this file does not exist, check the actual command:

   ```bash
   which chromium-browser
   which chromium
   ```

4. The desktop session uses display `:0` and the user has an Xauthority file.

   ```bash
   ls /home/ryuichi/.Xauthority
   ```

### Raspberry Pi client

When using a Raspberry Pi as the display client, install the color emoji font so
that the weather icons render correctly in Chromium:

```bash
sudo apt update
sudo apt install fonts-noto-color-emoji
fc-cache -fv
sudo systemctl restart kiosk.service
```

### Service file

The kiosk service is stored here:

```text
./systemd/kiosk.service
```

Current service:

```ini
[Unit]
Description=Kiosk Mode
After=graphical.target

[Service]
User=ryuichi
Environment=XAUTHORITY=/home/ryuichi/.Xauthority
Environment=DISPLAY=:0
ExecStart=/usr/bin/chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:18089
Restart=always

[Install]
WantedBy=graphical.target
```

Change `User`, `XAUTHORITY`, `DISPLAY`, or the Chromium path if your environment differs.

### Install and start

Use the helper script:

```bash
cd ./systemd
bash activate.sh
```

Or run the commands manually:

```bash
sudo cp /home/ryuichi/work/MagicMirrorCustom/systemd/kiosk.service /etc/systemd/system/kiosk.service
sudo systemctl daemon-reload
sudo systemctl enable kiosk.service
sudo systemctl restart kiosk.service
sudo systemctl status kiosk.service --no-pager
```

### Reboot test

```bash
sudo reboot
```

After reboot, the desktop should start, Chromium should open automatically, and MagicMirror should appear fullscreen at:

```text
http://localhost:18089
```

### Useful commands

Check kiosk status:

```bash
systemctl status kiosk.service --no-pager
```

Check MagicMirror container:

```bash
docker ps -a
docker logs --tail 120 mm
```

Restart kiosk browser only:

```bash
sudo systemctl restart kiosk.service
```

Disable kiosk autostart:

```bash
sudo systemctl disable kiosk.service
sudo systemctl stop kiosk.service
```

### Troubleshooting

If Chromium does not open, check these first:

```bash
ls /usr/bin/chromium-browser
ls /home/ryuichi/.Xauthority
echo $DISPLAY
systemctl status kiosk.service --no-pager
journalctl -u kiosk.service -n 100 --no-pager
```

If MagicMirror opens but the page is not ready yet, confirm the Docker container is running:

```bash
cd ./run
docker compose up -d
curl -I http://localhost:18089
```

If the browser opens too early after boot, add a short wait before Chromium starts:

```ini
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:18089
```
