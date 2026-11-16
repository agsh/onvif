#!/usr/bin/env python3
"""Optional lxml peer for tools/bench/parse-throughput.mjs."""
from __future__ import annotations

import json
import sys
import time

try:
    from lxml import etree
except ImportError:
    print(json.dumps({"skip": "lxml not installed"}))
    raise SystemExit(0)


def parse(xml: str) -> None:
    etree.fromstring(xml.encode("utf-8"))


def main() -> None:
    mode = sys.argv[1]
    path = sys.argv[2]
    with open(path, encoding="utf-8") as handle:
        xml = handle.read()

    if mode == "throughput":
        seconds = float(sys.argv[3])
        for _ in range(20):
            parse(xml)
        deadline = time.perf_counter() + seconds
        ops = 0
        t0 = time.perf_counter()
        while time.perf_counter() < deadline:
            parse(xml)
            ops += 1
        elapsed = time.perf_counter() - t0
        print(json.dumps({"ops": ops, "elapsed": elapsed, "perSec": ops / elapsed}))
        return

    if mode == "latency":
        repeats = int(sys.argv[3])
        for _ in range(5):
            parse(xml)
        samples = []
        for _ in range(repeats):
            t0 = time.perf_counter()
            parse(xml)
            samples.append((time.perf_counter() - t0) * 1000)
        samples.sort()
        print(
            json.dumps(
                {
                    "mean": sum(samples) / len(samples),
                    "median": samples[len(samples) // 2],
                    "min": samples[0],
                    "max": samples[-1],
                }
            )
        )
        return

    if mode == "burst":
        docs = int(sys.argv[3])
        for _ in range(3):
            parse(xml)
        t0 = time.perf_counter()
        for _ in range(docs):
            parse(xml)
        print(json.dumps({"wallMs": (time.perf_counter() - t0) * 1000, "docs": docs}))
        return

    if mode == "cold":
        t0 = time.perf_counter()
        parse(xml)
        print(json.dumps({"ms": (time.perf_counter() - t0) * 1000}))
        return

    raise SystemExit(f"unknown mode {mode}")


if __name__ == "__main__":
    main()
