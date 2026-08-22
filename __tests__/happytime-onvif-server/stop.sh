#! /bin/sh
# Prefer pkill: killall can miss path-launched binaries on some systems.
pkill -x rtspserver 2>/dev/null
pkill -x onvifserver 2>/dev/null
killall rtspserver 2>/dev/null
killall onvifserver 2>/dev/null
sleep 1
pkill -9 -x rtspserver 2>/dev/null
pkill -9 -x onvifserver 2>/dev/null
true
