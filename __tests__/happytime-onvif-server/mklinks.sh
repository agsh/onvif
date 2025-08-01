#! /bin/sh

CUR=$PWD/__tests__

if [ ! -f $CUR/libssl.so ]; then 
ln -s $CUR/libssl.so.1.1 $CUR/libssl.so
fi

if [ ! -f $CUR/libcrypto.so ]; then 
ln -s $CUR/libcrypto.so.1.1 $CUR/libcrypto.so
fi

if [ ! -f $CUR/libz.so.1 ]; then 
ln -s $CUR/libz.so.1.2.11 $CUR/libz.so.1
fi

if [ ! -f $CUR/libz.so ]; then 
ln -s $CUR/libz.so.1.2.11 $CUR/libz.so
fi

echo "make symbolic link finish!"
