#ifndef ZETA_BRIDGE_H
#define ZETA_BRIDGE_H

#include <stdint.h>
#include <stddef.h>

// Verifies a batch of Ed25519 signatures using the ZETA-Ω∞ MAX Kernel
// Matches the Go call: pks, sigs, msg, msg_len, count
int32_t verify_kin_batch(
    const uint8_t* pks,
    const uint8_t* sigs,
    const uint8_t* msg,
    uint64_t msg_len,
    uint64_t count
);
