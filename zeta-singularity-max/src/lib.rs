use std::fmt::Write as _;
use std::hint::black_box;
use std::os::raw::c_ulonglong;
use std::slice;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

static TOTAL_MINTED: AtomicU64 = AtomicU64::new(0);
static TOTAL_GAS: AtomicU64 = AtomicU64::new(0);
static TOTAL_SWAPS: AtomicU64 = AtomicU64::new(0);
static TOTAL_NFTS: AtomicU64 = AtomicU64::new(0);
static TOTAL_MEV: AtomicU64 = AtomicU64::new(0);
static TOTAL_DAO: AtomicU64 = AtomicU64::new(0);

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct GigaTxRaw {
    pub data: *const u8,
    pub len: u32,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct KernelOutputs {
    pub success: u64,
    pub gas: u64,
    pub ns: u64,
    pub swaps: u64,
    pub nfts: u64,
    pub mev: u64,
    pub dao: u64,
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct PerformanceReport {
    pub tx_count: usize,
    pub compute_ns: u64,
    pub ffi_ns: u64,
    pub throughput_tps: f64,
    pub outputs: KernelOutputs,
}

impl PerformanceReport {
    pub fn to_json_string(&self, label: &str) -> String {
        format!(
            concat!(
                "{{",
                "\"label\":\"{}\"",
                ",\"tx_count\":{}",
                ",\"compute_ns\":{}",
                ",\"ffi_ns\":{}",
                ",\"throughput_tps\":{:.2}",
                ",\"success\":{}",
                ",\"gas\":{}",
                ",\"swaps\":{}",
                ",\"nfts\":{}",
                ",\"mev\":{}",
                ",\"dao\":{}",
                "}}"
            ),
            escape_json_string(label),
            self.tx_count,
            self.compute_ns,
            self.ffi_ns,
            self.throughput_tps,
            self.outputs.success,
            self.outputs.gas,
            self.outputs.swaps,
            self.outputs.nfts,
            self.outputs.mev,
            self.outputs.dao,
        )
    }

    pub fn to_markdown(&self, label: &str) -> String {
        let mut markdown = String::new();
        let _ = writeln!(markdown, "# {} TPS Report", label);
        let _ = writeln!(markdown);
        let _ = writeln!(markdown, "| Metric | Value |");
        let _ = writeln!(markdown, "| --- | ---: |");
        let _ = writeln!(markdown, "| Transactions | {} |", self.tx_count);
        let _ = writeln!(markdown, "| Compute time (ns) | {} |", self.compute_ns);
        let _ = writeln!(markdown, "| FFI time (ns) | {} |", self.ffi_ns);
        let _ = writeln!(
            markdown,
            "| Throughput (TPS) | {:.2} |",
            self.throughput_tps
        );
        let _ = writeln!(markdown, "| Success | {} |", self.outputs.success);
        let _ = writeln!(markdown, "| Gas | {} |", self.outputs.gas);
        let _ = writeln!(markdown, "| Swaps | {} |", self.outputs.swaps);
        let _ = writeln!(markdown, "| NFTs | {} |", self.outputs.nfts);
        let _ = writeln!(markdown, "| MEV flags | {} |", self.outputs.mev);
        let _ = writeln!(markdown, "| DAO flags | {} |", self.outputs.dao);
        markdown
    }

    pub fn to_pretty_text(&self, label: &str) -> String {
        let mut text = String::new();
        let _ = writeln!(text, "{} performance report", label);
        let _ = writeln!(text, "Transactions: {}", self.tx_count);
        let _ = writeln!(text, "Compute time: {} ns", self.compute_ns);
        let _ = writeln!(text, "FFI time: {} ns", self.ffi_ns);
        let _ = writeln!(text, "Throughput: {:.2} TPS", self.throughput_tps);
        let _ = writeln!(text, "Success: {}", self.outputs.success);
        let _ = writeln!(text, "Gas: {}", self.outputs.gas);
        let _ = writeln!(text, "Swaps: {}", self.outputs.swaps);
        let _ = writeln!(text, "NFTs: {}", self.outputs.nfts);
        let _ = writeln!(text, "MEV flags: {}", self.outputs.mev);
        let _ = writeln!(text, "DAO flags: {}", self.outputs.dao);
        text
    }
}

#[derive(Clone, Copy, Debug, Default)]
struct TxDigest {
    lanes: [u64; 4],
}

impl TxDigest {
    fn from_bytes(bytes: &[u8]) -> Self {
        let mut digest = Self {
            lanes: [
                0x243f_6a88_85a3_08d3,
                0x1319_8a2e_0370_7344,
                0xa409_3822_299f_31d0,
                0x082e_fa98_ec4e_6c89,
            ],
        };

        for (idx, byte) in bytes.iter().copied().enumerate() {
            let lane = idx & 3;
            digest.lanes[lane] = digest.lanes[lane]
                .rotate_left(7)
                .wrapping_add((byte as u64) << ((idx & 7) * 8))
                ^ (idx as u64 + 1).wrapping_mul(0x9e37_79b9_7f4a_7c15);
        }

        digest
    }

    fn score(self) -> u64 {
        self.lanes
            .into_iter()
            .fold(0u64, |acc, lane| acc ^ lane.rotate_left(13))
    }
}

fn escape_json_string(input: &str) -> String {
    input.replace('\\', "\\\\").replace('"', "\\\"")
}

fn write_outputs(
    out: KernelOutputs,
    success: *mut u64,
    gas: *mut u64,
    ns: *mut u64,
    swaps: *mut u64,
    nfts: *mut u64,
    mev: *mut u64,
    dao: *mut u64,
) {
    unsafe {
        if !success.is_null() {
            *success = out.success;
        }
        if !gas.is_null() {
            *gas = out.gas;
        }
        if !ns.is_null() {
            *ns = out.ns;
        }
        if !swaps.is_null() {
            *swaps = out.swaps;
        }
        if !nfts.is_null() {
            *nfts = out.nfts;
        }
        if !mev.is_null() {
            *mev = out.mev;
        }
        if !dao.is_null() {
            *dao = out.dao;
        }
    }
}

fn process_batch(batch: &[GigaTxRaw]) -> KernelOutputs {
    let start = Instant::now();
    let mut outputs = KernelOutputs::default();

    for raw in batch {
        if raw.data.is_null() || raw.len == 0 {
            continue;
        }

        let payload = unsafe { slice::from_raw_parts(raw.data, raw.len as usize) };
        let digest = TxDigest::from_bytes(payload);
        let score = black_box(digest.score());

        outputs.success += 1;
        outputs.gas += 21_000 + (score & 0x3ff);
        outputs.swaps += (score & 0b1) as u64;
        outputs.nfts += ((score >> 1) & 0b1) as u64;
        outputs.mev += ((score >> 2) & 0b1) as u64;
        outputs.dao += ((score >> 3) & 0b1) as u64;
    }

    outputs.ns = start.elapsed().as_nanos() as u64;

    TOTAL_MINTED.fetch_add(outputs.success, Ordering::Relaxed);
    TOTAL_GAS.fetch_add(outputs.gas, Ordering::Relaxed);
    TOTAL_SWAPS.fetch_add(outputs.swaps, Ordering::Relaxed);
    TOTAL_NFTS.fetch_add(outputs.nfts, Ordering::Relaxed);
    TOTAL_MEV.fetch_add(outputs.mev, Ordering::Relaxed);
    TOTAL_DAO.fetch_add(outputs.dao, Ordering::Relaxed);

    outputs
}

#[no_mangle]
pub extern "C" fn giga_quantum_singularity_kernel(
    batch_ptr: *const GigaTxRaw,
    batch_len: u32,
    success: *mut u64,
    gas: *mut u64,
    ns: *mut u64,
    swaps: *mut u64,
    nfts: *mut u64,
    mev: *mut u64,
    dao: *mut u64,
) {
    if batch_ptr.is_null() || batch_len == 0 {
        write_outputs(
            KernelOutputs::default(),
            success,
            gas,
            ns,
            swaps,
            nfts,
            mev,
            dao,
        );
        return;
    }

    let batch = unsafe { slice::from_raw_parts(batch_ptr, batch_len as usize) };
    let outputs = process_batch(batch);
    write_outputs(outputs, success, gas, ns, swaps, nfts, mev, dao);
}

pub fn run_kernel(batch: &[GigaTxRaw]) -> KernelOutputs {
    if batch.is_empty() {
        return KernelOutputs::default();
    }
    process_batch(batch)
}

pub fn generate_payloads(tx_count: usize) -> Vec<Vec<u8>> {
    (0..tx_count)
        .map(|idx| format!("zeta-payload-{idx:08}").into_bytes())
        .collect()
}

pub fn benchmark_transactions(payloads: &[Vec<u8>]) -> PerformanceReport {
    let compute_started = Instant::now();
    let txs: Vec<GigaTxRaw> = payloads
        .iter()
        .map(|payload| GigaTxRaw {
            data: payload.as_ptr(),
            len: payload.len() as u32,
        })
        .collect();
    let compute_ns = compute_started.elapsed().as_nanos() as u64;

    let ffi_started = Instant::now();
    let outputs = run_kernel(&txs);
    let ffi_ns = ffi_started.elapsed().as_nanos() as u64;
    let elapsed = Duration::from_nanos(ffi_ns.max(1));
    let throughput_tps = txs.len() as f64 / elapsed.as_secs_f64();

    PerformanceReport {
        tx_count: txs.len(),
        compute_ns,
        ffi_ns,
        throughput_tps,
        outputs,
    }
}

#[no_mangle]
pub extern "C" fn get_giga_flow() -> c_ulonglong {
    TOTAL_MINTED.load(Ordering::Relaxed) as c_ulonglong
}

#[no_mangle]
pub extern "C" fn reset_giga_flow() {
    TOTAL_MINTED.store(0, Ordering::SeqCst);
    TOTAL_GAS.store(0, Ordering::SeqCst);
    TOTAL_SWAPS.store(0, Ordering::SeqCst);
    TOTAL_NFTS.store(0, Ordering::SeqCst);
    TOTAL_MEV.store(0, Ordering::SeqCst);
    TOTAL_DAO.store(0, Ordering::SeqCst);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_batch(payloads: &[&[u8]]) -> Vec<GigaTxRaw> {
        payloads
            .iter()
            .map(|payload| GigaTxRaw {
                data: payload.as_ptr(),
                len: payload.len() as u32,
            })
            .collect()
    }

    #[test]
    fn null_batch_writes_zeroes() {
        let mut outputs = KernelOutputs::default();
        giga_quantum_singularity_kernel(
            std::ptr::null(),
            0,
            &mut outputs.success,
            &mut outputs.gas,
            &mut outputs.ns,
            &mut outputs.swaps,
            &mut outputs.nfts,
            &mut outputs.mev,
            &mut outputs.dao,
        );
        assert_eq!(outputs, KernelOutputs::default());
    }

    #[test]
    fn kernel_counts_only_non_empty_transactions() {
        reset_giga_flow();
        let payload_a = b"alpha";
        let payload_b = b"beta";
        let mut batch = make_batch(&[payload_a.as_slice(), payload_b.as_slice()]);
        batch.push(GigaTxRaw {
            data: std::ptr::null(),
            len: 0,
        });

        let outputs = run_kernel(&batch);
        assert_eq!(outputs.success, 2);
        assert!(outputs.gas >= 42_000);
        assert_eq!(get_giga_flow(), 2);
    }

    #[test]
    fn tps_dress_rehearsal_reports_positive_throughput() {
        reset_giga_flow();
        let payloads = generate_payloads(1_024);

        let report = benchmark_transactions(&payloads);
        assert_eq!(report.tx_count, 1_024);
        assert_eq!(report.outputs.success, 1_024);
        assert!(report.compute_ns > 0);
        assert!(report.ffi_ns > 0);
        assert!(report.throughput_tps.is_finite());
        assert!(report.throughput_tps > 0.0);
    }

    #[test]
    fn report_formats_are_script_friendly() {
        let report = PerformanceReport {
            tx_count: 8,
            compute_ns: 10,
            ffi_ns: 20,
            throughput_tps: 400_000.0,
            outputs: KernelOutputs {
                success: 8,
                gas: 168_000,
                ns: 20,
                swaps: 2,
                nfts: 1,
                mev: 1,
                dao: 0,
            },
        };

        let json = report.to_json_string("sei-giga/sip-3");
        assert!(json.contains("\"label\":\"sei-giga/sip-3\""));
        assert!(json.contains("\"throughput_tps\":400000.00"));

        let markdown = report.to_markdown("Sei-Giga SIP-3");
        assert!(markdown.contains("# Sei-Giga SIP-3 TPS Report"));
        assert!(markdown.contains("| Throughput (TPS) | 400000.00 |"));
    }
}
