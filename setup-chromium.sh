#!/bin/bash

echo
echo
echo "~~~~~~demo prep ec2-ami"
date
echo
echo "~~~~~~ as user: root"
# not forcing off if not root
echo "whoami: " `whoami`

echo
echo "~~~~~~ always good to do a yum update"
yum update -y

git --version 

echo
echo "~~~~~~ setup extras needed for other tools"
echo
yum install -y gcc openssl-devel bzip2-devel libffi-devel 
sudo amazon-linux-extras install epel -y


echo
echo "~~~~~~ setup vm desktop and web browser"
echo
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm 
sudo yum install -y ./google-chrome-stable_current_*.rpm


sudo yum install chromium -y

yum install xorg-x11-xauth -y
yum install xclock xterm -y

# clean up file
rm -Rf ~/dev/demo/google-chrome-stable_current_x86_64.rpm
echo "********* INSTALLED"