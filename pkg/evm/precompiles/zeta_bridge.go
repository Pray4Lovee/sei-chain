package precompiles

/*
#cgo LDFLAGS: -L. -lzeta_omega_infinity
#include <stdint.h>
#include <stdlib.h>

// Updated to match the new Rust batch signature
int32_t verify_kin_batch(
    const uint8_t* pks, 
    const uint8_t* sigs, 
    const uint8_t* msg, 
    uint64_t msg_len, 
    uint64_t count
);
*/
import "C"

import (
        "unsafe"
        "github.com/ethereum/go-ethereum/common"
)

var PrecompileZetaBridge = common.HexToAddress("0x1337")

type ZetaBridge struct{}

func (z *ZetaBridge) Run(input []byte) ([]byte, error) {
        // Minimum: 1 (count) + 32 (1 PK) + 64 (1 Sig) = 97 bytes
        if len(input) < 97 {
                return []byte{0}, nil
        }

        // Move input to C-allocated memory to stop Go pointer shifting
        cInput := C.CBytes(input)
        defer C.free(cInput)

        // 1. Extract Batch Count
        count := uint64(input[0])
        base := uintptr(cInput)

        // 2. Calculate Batch Offsets
        // Layout: [1 byte: count] [count*32: PKs] [count*64: Sigs] [rest: Msg]
        pkPtr := (*C.uint8_t)(unsafe.Pointer(base + 1))
        sigPtr := (*C.uint8_t)(unsafe.Pointer(base + 1 + uintptr(count*32)))
        msgPtr := (*C.uint8_t)(unsafe.Pointer(base + 1 + uintptr(count*32) + uintptr(count*64)))

        // Ensure we don't have an underflow on msgLen
        msgOffset := 1 + (count * 96)
        if uint64(len(input)) < msgOffset {
                return []byte{0}, nil
        }
        msgLen := uint64(len(input)) - msgOffset

        // Hardware Handoff to Rust Kernel
        res := C.verify_kin_batch(
                pkPtr, 
                sigPtr, 
                msgPtr, 
                C.uint64_t(msgLen), 
                C.uint64_t(count),
        )

        if res == 1 {
                return []byte{1}, nil
        }
        return []byte{0}, nil
}
