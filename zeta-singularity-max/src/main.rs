use std::env;
use std::process;

use zeta_singularity_max::{benchmark_transactions, generate_payloads, reset_giga_flow};

struct Args {
    tx_count: usize,
    label: String,
    json: bool,
    markdown: bool,
}

fn parse_args() -> Result<Args, String> {
    let mut tx_count = 65_536usize;
    let mut label = String::from("ZETA-Ω∞ MAX");
    let mut json = false;
    let mut markdown = false;

    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--tx-count" => {
                let value = args.next().ok_or("missing value for --tx-count")?;
                tx_count = value
                    .parse::<usize>()
                    .map_err(|_| format!("invalid tx count: {value}"))?;
            }
            "--label" => {
                label = args.next().ok_or("missing value for --label")?;
            }
            "--json" => {
                json = true;
            }
            "--markdown" => {
                markdown = true;
            }
            "--help" | "-h" => {
                return Err(String::from(
                    "usage: zeta-omega-infinity [--tx-count N] [--label NAME] [--json|--markdown]",
                ));
            }
            _ => return Err(format!("unknown argument: {arg}")),
        }
    }

    Ok(Args {
        tx_count,
        label,
        json,
        markdown,
    })
}

fn main() {
    let args = match parse_args() {
        Ok(args) => args,
        Err(message) => {
            eprintln!("{message}");
            process::exit(2);
        }
    };

    reset_giga_flow();

    let payloads = generate_payloads(args.tx_count);
    let report = benchmark_transactions(&payloads);

    if args.json {
        println!("{}", report.to_json_string(&args.label));
        return;
    }

    if args.markdown {
        println!("{}", report.to_markdown(&args.label));
        return;
    }

    print!("{}", report.to_pretty_text(&args.label));
}
