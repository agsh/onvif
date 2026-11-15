#! /bin/sh

killall rtspserver 2>/dev/null
killall onvifserver 2>/dev/null
# Wedged Happytime can ignore SIGTERM while holding :8000 (TCP accept, no HTTP).
sleep 1
if pgrep -x onvifserver >/dev/null 2>&1; then
	killall -9 onvifserver 2>/dev/null
fi
if pgrep -x rtspserver >/dev/null 2>&1; then
	killall -9 rtspserver 2>/dev/null
fi
