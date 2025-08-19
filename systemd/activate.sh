#!/bin/bash

set -euo
sudo cp ./kiosk.service /etc/systemd/system/kiosk.service

sudo systemctl enable kiosk.service
sudo systemctl start kiosk.service

