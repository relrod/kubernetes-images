// HTTP reverse proxy to 'fix' Set-Cookie headers from ERCOT (by removing them)
// Deno rejects the whole response because of any invalid cookies

package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func main() {
	remote, err := url.Parse("http://www.ercot.com")
	if err != nil {
		panic(err)
	}
	log.Println("Yup")

	proxy := newReverseProxy(remote)
	http.HandleFunc("/", handler(proxy))
	err = http.ListenAndServe("127.0.0.1:5102", nil)
	if err != nil {
		panic(err)
	}
}

func handler(p *httputil.ReverseProxy) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.Method, r.URL)
		r.Host = "www.ercot.com"
		p.ServeHTTP(w, r)
	}
}

func newReverseProxy(target *url.URL) *httputil.ReverseProxy {
	director := func(req *http.Request) {
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		if _, ok := req.Header["User-Agent"]; !ok {
			// explicitly disable User-Agent so it's not set to default value
			req.Header.Set("User-Agent", "")
		}
	}
	return &httputil.ReverseProxy{
		Director: director,
		ModifyResponse: func(resp *http.Response) error {
			resp.Header.Del("Set-Cookie")
			return nil
		},
	}
}
