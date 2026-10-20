//go:build !darwin && !linux

package main

import "fmt"

func lockDataDirectory(dir string) (func(), error) {
	return nil, fmt.Errorf("当前启动器的数据目录锁支持 macOS / Linux；其他系统请先实现系统级文件锁")
}
