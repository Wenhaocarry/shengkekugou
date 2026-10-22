#!/bin/zsh
cd -- "${0:A:h}"
./start.sh "$@"
result=$?
if [ "$result" -ne 0 ]; then
  printf '\n启动失败。如果提示 address already in use，浏览器打开 http://127.0.0.1:8101 即可；不要重复启动。\n按回车关闭窗口。'
  read -r
fi
exit "$result"
