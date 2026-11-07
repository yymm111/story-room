#!/bin/zsh
cd -- "${0:A:h}"
python3 setup_ai_voice.py
printf '\n按回车关闭这个窗口。'
read
