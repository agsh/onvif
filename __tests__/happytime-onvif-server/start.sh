#! /bin/sh

killall rtspserver
killall onvifserver
sleep 1
CUR=$(cd $(dirname $0); pwd)
rm $CUR/onvifrun.cfg
rm $CUR/onvifserver-*.log
$CUR/mklinks.sh
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUR
$CUR/onvifserver
