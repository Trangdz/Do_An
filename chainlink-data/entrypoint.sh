#!/bin/sh
set -e
# Ensure secrets.toml is in /root (where chainlink looks for it)
if [ -f /chainlink/secrets.toml ]; then
  cp /chainlink/secrets.toml /root/secrets.toml
  chmod 600 /root/secrets.toml
fi
# Ensure config.toml is in /root
if [ -f /chainlink/config.toml ]; then
  cp /chainlink/config.toml /root/config.toml
  chmod 600 /root/config.toml
fi
# Change to root directory
cd /root
# Execute chainlink
exec /usr/local/bin/chainlink "$@"

