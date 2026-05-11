#! /bin/sh

CUR="$(dirname "$(readlink -f "$0")")"
$CUR/mklinks.sh
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUR
$CUR/onvifserver