#!/bin/bash

set -euo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sudo cp "${SCRIPT_DIR}/kiosk.service" /etc/systemd/system/kiosk.service
sudo systemctl daemon-reload

sudo systemctl enable kiosk.service
sudo systemctl restart kiosk.service
sudo systemctl status kiosk.service --no-pager
