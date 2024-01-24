#!/bin/bash
set -e
usermod -a -G root nginx
chmod 710 /workspace/outposts/assets