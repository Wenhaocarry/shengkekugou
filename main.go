package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
)

//go:embed web/*
var webFiles embed.FS

func main() {
	addr := flag.String("addr", "127.0.0.1:8100", "HTTP listen address")
	data := flag.String("data", "data", "persistent data directory")
	seed := flag.Bool("seed", true, "add clearly labeled sample songs on first launch")
	expandDemo := flag.Bool("expand-playlist-demo", false, "add the PDF playlist examples without replacing existing data")
	flag.Parse()
	dir, err := filepath.Abs(*data)
	if err != nil {
		log.Fatal(err)
	}
	unlock, err := lockDataDirectory(dir)
	if err != nil {
		log.Fatal(err)
	}
	defer unlock()
	store, err := openStore(dir, *seed)
	if err != nil {
		log.Fatal(err)
	}
	if *expandDemo {
		if err := store.expandPlaylistDemo(); err != nil {
			log.Fatal(err)
		}
	}
	ui, _ := fs.Sub(webFiles, "web")
	app := &App{store: store, ui: ui}
	srv := &http.Server{Addr: *addr, Handler: app.handler(), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 1 << 20}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdown)
	}()
	fmt.Printf("\n声刻已启动 → http://%s\n本地数据 → %s\n单用户演示模式；请勿直接暴露到公网。\n\n", *addr, dir)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
