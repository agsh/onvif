package main

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"io"
	"os"
	"strconv"
	"time"
)

func parse(data []byte) {
	dec := xml.NewDecoder(bytes.NewReader(data))
	for {
		_, err := dec.Token()
		if err == io.EOF {
			return
		}
		if err != nil {
			panic(err)
		}
	}
}

func main() {
	mode := os.Args[1]
	path := os.Args[2]
	raw, err := os.ReadFile(path)
	if err != nil {
		panic(err)
	}

	switch mode {
	case "throughput":
		seconds, _ := strconv.ParseFloat(os.Args[3], 64)
		for i := 0; i < 20; i++ {
			parse(raw)
		}
		deadline := time.Now().Add(time.Duration(seconds * float64(time.Second)))
		ops := 0
		t0 := time.Now()
		for time.Now().Before(deadline) {
			parse(raw)
			ops++
		}
		elapsed := time.Since(t0).Seconds()
		_ = json.NewEncoder(os.Stdout).Encode(map[string]any{
			"ops": ops, "elapsed": elapsed, "perSec": float64(ops) / elapsed,
		})
	case "latency":
		repeats, _ := strconv.Atoi(os.Args[3])
		for i := 0; i < 5; i++ {
			parse(raw)
		}
		samples := make([]float64, 0, repeats)
		for i := 0; i < repeats; i++ {
			t0 := time.Now()
			parse(raw)
			samples = append(samples, float64(time.Since(t0).Microseconds())/1000.0)
		}
		for i := 1; i < len(samples); i++ {
			j := i
			for j > 0 && samples[j-1] > samples[j] {
				samples[j-1], samples[j] = samples[j], samples[j-1]
				j--
			}
		}
		sum := 0.0
		for _, s := range samples {
			sum += s
		}
		_ = json.NewEncoder(os.Stdout).Encode(map[string]any{
			"mean":   sum / float64(len(samples)),
			"median": samples[len(samples)/2],
			"min":    samples[0],
			"max":    samples[len(samples)-1],
		})
	case "burst":
		docs, _ := strconv.Atoi(os.Args[3])
		for i := 0; i < 3; i++ {
			parse(raw)
		}
		t0 := time.Now()
		for i := 0; i < docs; i++ {
			parse(raw)
		}
		_ = json.NewEncoder(os.Stdout).Encode(map[string]any{
			"wallMs": float64(time.Since(t0).Microseconds()) / 1000.0,
			"docs":   docs,
		})
	case "cold":
		t0 := time.Now()
		parse(raw)
		_ = json.NewEncoder(os.Stdout).Encode(map[string]any{
			"ms": float64(time.Since(t0).Microseconds()) / 1000.0,
		})
	default:
		panic("unknown mode")
	}
}
