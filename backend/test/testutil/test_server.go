package testutil

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
)

// StartDummyServer starts a simple HTTP server on the given port that always responds with responseBody.
// Returns a function to stop the server.
func StartDummyServer(port int, responseBody string) (stop func()) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Dummy backend on port %d received request: %s %s", port, r.Method, r.URL.Path)
		fmt.Fprint(w, responseBody)
	})

	srv := &http.Server{
		Addr:    ":" + strconv.Itoa(port),
		Handler: mux,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Dummy backend server on port %d error: %v", port, err)
		}
	}()

	return func() {
		_ = srv.Close()
	}
}
