#!/bin/sh
# Wait until Happytime ONVIF server accepts HTTP connections.
# Usage: wait-ready.sh [host] [port] [timeout_seconds]

HOST="${1:-127.0.0.1}"
PORT="${2:-8000}"
TIMEOUT="${3:-30}"
URL="http://${HOST}:${PORT}/"

# Happytime ships old OpenSSL; never inherit LD_LIBRARY_PATH when calling system curl.
curl_http_code() {
	LD_LIBRARY_PATH= curl -s -o /dev/null -w "%{http_code}" --connect-timeout 1 "$1" 2>/dev/null
}

i=0
while [ "$i" -lt "$TIMEOUT" ]; do
	code=$(curl_http_code "$URL")
	code=${code:-000}
	# Any real HTTP response (including 404) means the server is listening
	if [ "$code" != "000" ]; then
		echo "Happytime ONVIF server ready at ${URL} (HTTP ${code}, waited ${i}s)"
		exit 0
	fi
	i=$((i + 1))
	sleep 1
done

echo "Timed out after ${TIMEOUT}s waiting for Happytime at ${URL}" >&2
exit 1
