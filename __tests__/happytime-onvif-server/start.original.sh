#! /bin/sh

CUR=$(cd $(dirname $0); pwd)
$CUR/mklinks.sh
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUR
$CUR/onvifserver