#!/bin/sh
# Starts Node-RED 4.1.x with the local user directory (editor + dashboard on 127.0.0.1:1880)
cd /home/claude/p12lowcode
exec ./node_modules/.bin/node-red --userDir /home/claude/p12lowcode/userdir --settings /home/claude/p12lowcode/userdir/settings.js
