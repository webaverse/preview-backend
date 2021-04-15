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

echo
echo "~~~~~~ setup extras needed for other tools"
echo
yum install -y gcc openssl-devel bzip2-devel libffi-devel atk java-atk-wrapper at-spi2-atk gtk3 libXt cups-libs cups-libs.i686 cups-libs.x86_64 dbus-glib libXrandr libXcursor libXinerama cairo cairo-gobject pango libcups libXss
sudo amazon-linux-extras install epel -y

echo
echo "~~~~~~ setup vm desktop and web browser"
echo
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm 
sudo yum install -y ./google-chrome-stable_current_*.rpm

sudo yum install chromium -y

yum install xorg-x11-xauth -y
yum install xclock xterm -y

sudo yum install -y cups-libs dbus-glib libXrandr libXcursor libXinerama cairo cairo-gobject pango

# Install ATK from CentOS 7
sudo rpm -ivh --nodeps http://mirror.centos.org/centos/7/os/x86_64/Packages/atk-2.22.0-3.el7.x86_64.rpm
sudo rpm -ivh --nodeps http://mirror.centos.org/centos/7/os/x86_64/Packages/at-spi2-atk-2.22.0-2.el7.x86_64.rpm
sudo rpm -ivh --nodeps http://mirror.centos.org/centos/7/os/x86_64/Packages/at-spi2-core-2.22.0-1.el7.x86_64.rpm

# Install GTK from fedora 20
sudo rpm -ivh --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/g/GConf2-3.2.6-7.fc20.x86_64.rpm
sudo rpm -ivh --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/l/libXScrnSaver-1.2.2-6.fc20.x86_64.rpm
sudo rpm -ivh --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/l/libxkbcommon-0.3.1-1.fc20.x86_64.rpm
sudo rpm -ivh --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/l/libwayland-client-1.2.0-3.fc20.x86_64.rpm
sudo rpm -ivh --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/l/libwayland-cursor-1.2.0-3.fc20.x86_64.rpm
sudo rpm -ivh --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/g/gtk3-3.10.4-1.fc20.x86_64.rpm

# Install Gdk-Pixbuf from fedora 16
sudo rpm -ivh --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/16/Fedora/x86_64/os/Packages/gdk-pixbuf2-2.24.0-1.fc16.x86_64.rpm

echo "********* INSTALLED"