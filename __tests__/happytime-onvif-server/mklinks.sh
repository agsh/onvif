#! /bin/sh

CUR="$(dirname "$(readlink -f "$0")")"

if [ ! -f $CUR/libssl.so ]; then 
ln -s $CUR/libssl.so.3 $CUR/libssl.so
fi

if [ ! -f $CUR/libcrypto.so ]; then 
ln -s $CUR/libcrypto.so.3 $CUR/libcrypto.so
fi

echo "make symbolic link finish!"
