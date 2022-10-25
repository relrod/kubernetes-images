FROM quay.io/centos/centos:stream9

# install nagios from pkg manager
RUN dnf clean expire-cache \
 && dnf install -y epel-release dnf-plugins-core \
 && dnf config-manager --set-enabled crb \
 && dnf install -y \
      nagios nagios-selinux nagios-plugins-all nagios-plugins-nrpe \
      perl-LWP-Protocol-https perl-Crypt-SSLeay perl-libwww-perl \
      python-requests \
      vim \
 && dnf clean all

# install pinned kubectl release directly
RUN curl -LO \
    https://storage.googleapis.com/kubernetes-release/release/v1.18.2/bin/linux/amd64/kubectl \
 && chmod +x ./kubectl \
 && mv ./kubectl /usr/local/bin/kubectl \
 && kubectl version --client

# patch baseurl for direct hosting
RUN sed -Ei.bak "/cgi_base_url/s#='.+'#='/cgi-bin'#" \
      /usr/share/nagios/html/config.inc.php

# make it so nagios user can ping
RUN setcap cap_net_admin,cap_net_raw+p /usr/bin/ping
