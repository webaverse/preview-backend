#!/usr/bin/env bash

opts="req -nodes -new -x509"
dest='./certs'

mkdir -p "$dest"
openssl $opts -keyout "$dest/privkey.pem" -out "$dest/fullchain.pem"
