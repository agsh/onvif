use quick_xml::events::Event;
use quick_xml::reader::Reader;
use serde_json::json;
use std::env;
use std::fs;
use std::time::Instant;

fn parse(xml: &str) {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(e) => panic!("parse error: {e:?}"),
        }
        buf.clear();
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mode = &args[1];
    let path = &args[2];
    let xml = fs::read_to_string(path).expect("read fixture");

    match mode.as_str() {
        "throughput" => {
            let seconds: f64 = args[3].parse().unwrap();
            for _ in 0..20 {
                parse(&xml);
            }
            let deadline = Instant::now() + std::time::Duration::from_secs_f64(seconds);
            let mut ops: u64 = 0;
            let t0 = Instant::now();
            while Instant::now() < deadline {
                parse(&xml);
                ops += 1;
            }
            let elapsed = t0.elapsed().as_secs_f64();
            println!(
                "{}",
                json!({ "ops": ops, "elapsed": elapsed, "perSec": (ops as f64) / elapsed })
            );
        }
        "latency" => {
            let repeats: usize = args[3].parse().unwrap();
            for _ in 0..5 {
                parse(&xml);
            }
            let mut samples = Vec::with_capacity(repeats);
            for _ in 0..repeats {
                let t0 = Instant::now();
                parse(&xml);
                samples.push(t0.elapsed().as_secs_f64() * 1000.0);
            }
            samples.sort_by(|a, b| a.partial_cmp(b).unwrap());
            let mean = samples.iter().sum::<f64>() / samples.len() as f64;
            println!(
                "{}",
                json!({
                    "mean": mean,
                    "median": samples[samples.len() / 2],
                    "min": samples[0],
                    "max": samples[samples.len() - 1],
                })
            );
        }
        "burst" => {
            let docs: usize = args[3].parse().unwrap();
            for _ in 0..3 {
                parse(&xml);
            }
            let t0 = Instant::now();
            for _ in 0..docs {
                parse(&xml);
            }
            println!(
                "{}",
                json!({ "wallMs": t0.elapsed().as_secs_f64() * 1000.0, "docs": docs })
            );
        }
        "cold" => {
            let t0 = Instant::now();
            parse(&xml);
            println!("{}", json!({ "ms": t0.elapsed().as_secs_f64() * 1000.0 }));
        }
        _ => panic!("unknown mode"),
    }
}
