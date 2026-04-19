package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func main() {
	// Route traffic to the Python Report Service
	target, err := url.Parse("http://report-service:5000")
	if err != nil {
		log.Fatal(err)
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	http.HandleFunc("/api/v1/reports", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Routing request to Report Service")
		proxy.ServeHTTP(w, r)
	})

	log.Println("API Gateway running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
