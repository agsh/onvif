#!/bin/sh
# Happytime advertises VideoSource/VideoEncoder (and audio) configurations but does not
# attach them to media profiles until Add*Configuration is called. Attach them so
# connect()/getProfiles()/stream URI/PTZ tests see a usable Profile S/T layout.
#
# Usage: hydrate-profiles.sh [host] [port]

HOST="${1:-127.0.0.1}"
PORT="${2:-8000}"
MEDIA="http://${HOST}:${PORT}/onvif/media_service"

# Happytime ships old OpenSSL; never inherit LD_LIBRARY_PATH when calling system curl.
soap() {
	if ! LD_LIBRARY_PATH= curl -sf -X POST "$MEDIA" \
		-H 'Content-Type: application/soap+xml; charset=utf-8' \
		--data-binary "$1" >/dev/null; then
		echo "hydrate-profiles: SOAP request failed" >&2
		return 1
	fi
}

add_config() {
	profile_token=$1
	op=$2
	config_token=$3
	soap "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\">
  <s:Body>
    <trt:${op} xmlns:trt=\"http://www.onvif.org/ver10/media/wsdl\">
      <trt:ProfileToken>${profile_token}</trt:ProfileToken>
      <trt:ConfigurationToken>${config_token}</trt:ConfigurationToken>
    </trt:${op}>
  </s:Body>
</s:Envelope>"
}

set -e

# Profile 1: main stream
add_config ProfileToken_1 AddVideoSourceConfiguration VideoSourceConfigurationToken_1
add_config ProfileToken_1 AddVideoEncoderConfiguration VideoEncoderConfigurationToken_1
add_config ProfileToken_1 AddAudioSourceConfiguration AudioSourceConfigurationToken_1
add_config ProfileToken_1 AddAudioEncoderConfiguration AudioEncoderConfigurationToken_1

# Profile 2: secondary encoder
add_config ProfileToken_2 AddVideoSourceConfiguration VideoSourceConfigurationToken_1
add_config ProfileToken_2 AddVideoEncoderConfiguration VideoEncoderConfigurationToken_2
add_config ProfileToken_2 AddAudioSourceConfiguration AudioSourceConfigurationToken_1
add_config ProfileToken_2 AddAudioEncoderConfiguration AudioEncoderConfigurationToken_1

echo "Happytime media profiles hydrated at ${HOST}:${PORT}"
