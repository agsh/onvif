#! /bin/sh

killall rtspserver 2>/dev/null
killall onvifserver 2>/dev/null
sleep 1
CUR=$(cd $(dirname $0); pwd)
rm -f $CUR/onvifrun.cfg
rm -f $CUR/onvifserver-*.log
$CUR/mklinks.sh
# Scope Happytime's bundled OpenSSL to the server only — do not export into the
# parent shell or sibling wait-ready/hydrate/curl processes.
LD_LIBRARY_PATH="${LD_LIBRARY_PATH:+$LD_LIBRARY_PATH:}$CUR" "$CUR/onvifserver"
