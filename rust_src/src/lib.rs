use ed25519_dalek::{PublicKey, Signature, Verifier};
use std::slice;

// Imports specifically for testing to keep the production build clean
#[cfg(test)]
use ed25519_dalek::{Keypair, SecretKey, Signer};

#[no_mangle]
pub extern "C" fn verify_kin_batch(
    public_keys_ptr: *const u8, // Pointer to N * 32 bytes
    signatures_ptr: *const u8,  // Pointer to N * 64 bytes
    msg_ptr: *const u8,         // Shared message pointer
    msg_len: usize,
    count: usize,               // Number of signatures to verify
) -> i32 {
    // Basic safety checks and a Giga-Batch limit (e.g., 2048) to prevent OOM
    if public_keys_ptr.is_null() || signatures_ptr.is_null() || count == 0 || count > 2048 {
        return 0;
    }

    unsafe {
        // Create slices for all keys and signatures (Zero-copy)
        let pk_bytes_all = slice::from_raw_parts(public_keys_ptr, count * 32);
        let sig_bytes_all = slice::from_raw_parts(signatures_ptr, count * 64);

        let msg_slice = if msg_len == 0 {
            &[]
        } else if msg_ptr.is_null() {
            return 0;
        } else {
            slice::from_raw_parts(msg_ptr, msg_len)
        };

        for i in 0..count {
            // Offset calculation for the current index in the batch
            let pk_start = i * 32;
            let sig_start = i * 64;

            let public_key = match PublicKey::from_bytes(&pk_bytes_all[pk_start..pk_start + 32]) {
                Ok(pk) => pk,
                Err(_) => return 0,
            };

            let signature = match Signature::from_bytes(&sig_bytes_all[sig_start..sig_start + 64]) {
                Ok(sig) => sig,
                Err(_) => return 0,
            };

            // Individual verification
            if public_key.verify(msg_slice, &signature).is_err() {
                return 0; // Failure on any one signature invalidates the whole batch
            }
        }

        1 // Success
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_kin_batch_multiple() {
        let count = 3;
        let mut pks = Vec::new();
        let mut sigs = Vec::new();
        let msg = b"SeiGigaBatch";

        // Generate deterministic keys from seeds
        for i in 0..count {
            let seed = [i as u8; 32];
            let secret = SecretKey::from_bytes(&seed).unwrap();
            let public = PublicKey::from(&secret);
            let keypair = Keypair { secret, public };

            let sig = keypair.sign(msg);
            pks.extend_from_slice(&public.to_bytes());
            sigs.extend_from_slice(&sig.to_bytes());
        }

        let result = verify_kin_batch(
            pks.as_ptr(),
            sigs.as_ptr(),
            msg.as_ptr(),
            msg.len(),
            count,
        );

        assert_eq!(result, 1, "Batch verification failed for valid signatures");
    }
}
