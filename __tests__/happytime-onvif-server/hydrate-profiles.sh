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

# Reset main encoder to H264. Media suite may leave Token_1 as MPEG4 after failed/partial sets.
soap "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\">
  <s:Body>
    <trt:SetVideoEncoderConfiguration xmlns:trt=\"http://www.onvif.org/ver10/media/wsdl\" xmlns:tt=\"http://www.onvif.org/ver10/schema\">
      <trt:Configuration token=\"VideoEncoderConfigurationToken_1\">
        <tt:Name>VideoEncoderConfigurationName_1</tt:Name>
        <tt:UseCount>1</tt:UseCount>
        <tt:Encoding>H264</tt:Encoding>
        <tt:Resolution><tt:Width>1280</tt:Width><tt:Height>720</tt:Height></tt:Resolution>
        <tt:Quality>5</tt:Quality>
        <tt:RateControl>
          <tt:FrameRateLimit>25</tt:FrameRateLimit>
          <tt:EncodingInterval>1</tt:EncodingInterval>
          <tt:BitrateLimit>2048</tt:BitrateLimit>
        </tt:RateControl>
        <tt:H264>
          <tt:GovLength>25</tt:GovLength>
          <tt:H264Profile>Main</tt:H264Profile>
        </tt:H264>
        <tt:Multicast>
          <tt:Address><tt:Type>IPv4</tt:Type><tt:IPv4Address>0.0.0.0</tt:IPv4Address></tt:Address>
          <tt:Port>0</tt:Port>
          <tt:TTL>1</tt:TTL>
          <tt:AutoStart>false</tt:AutoStart>
        </tt:Multicast>
        <tt:SessionTimeout>PT60S</tt:SessionTimeout>
      </trt:Configuration>
      <trt:ForcePersistence>true</trt:ForcePersistence>
    </trt:SetVideoEncoderConfiguration>
  </s:Body>
</s:Envelope>"

echo "Happytime media profiles hydrated at ${HOST}:${PORT}"
