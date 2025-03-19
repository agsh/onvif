#! /bin/sh

CUR=$(cd $(dirname $0); pwd)
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUR
$CUR/onvifserver
