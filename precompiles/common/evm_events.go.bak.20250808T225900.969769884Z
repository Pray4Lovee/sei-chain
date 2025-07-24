package common

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/core/vm"
	"github.com/sei-protocol/sei-chain/precompiles/abi"
)

// EmitDelegateEvent emits a Delegate(address,string,uint256) event
func EmitDelegateEvent(evm *vm.EVM, precompileAddr common.Address, delegator common.Address, validator string, amount *big.Int) error {
	topics := []common.Hash{
		crypto.Keccak256Hash([]byte("Delegate(address,string,uint256)")),
		common.BytesToHash(delegator.Bytes()),
		crypto.Keccak256Hash([]byte(validator)),
	}
	evm.StateDB.AddLog(&types.Log{
		Address: precompileAddr,
		Topics:  topics,
		Data:    amount.Bytes(),
	})
	return nil
}

// EmitUndelegateEvent emits an Undelegate(address,string,uint256) event
func EmitUndelegateEvent(evm *vm.EVM, precompileAddr common.Address, delegator common.Address, validator string, amount *big.Int) error {
	topics := []common.Hash{
		crypto.Keccak256Hash([]byte("Undelegate(address,string,uint256)")),
		common.BytesToHash(delegator.Bytes()),
		crypto.Keccak256Hash([]byte(validator)),
	}
	evm.StateDB.AddLog(&types.Log{
		Address: precompileAddr,
		Topics:  topics,
		Data:    amount.Bytes(),
	})
	return nil
}

// EmitRedelegateEvent emits a Redelegate(address,string,string,uint256) event
func EmitRedelegateEvent(evm *vm.EVM, precompileAddr common.Address, delegator common.Address, srcValidator string, dstValidator string, amount *big.Int) error {
	topics := []common.Hash{
		crypto.Keccak256Hash([]byte("Redelegate(address,string,string,uint256)")),
		common.BytesToHash(delegator.Bytes()),
		crypto.Keccak256Hash([]byte(srcValidator)),
		crypto.Keccak256Hash([]byte(dstValidator)),
	}
	evm.StateDB.AddLog(&types.Log{
		Address: precompileAddr,
		Topics:  topics,
		Data:    amount.Bytes(),
	})
	return nil
}

// EmitValidatorCreatedEvent emits a ValidatorCreated(string,uint256)
func EmitValidatorCreatedEvent(evm *vm.EVM, precompileAddr common.Address, validator string, amount *big.Int) error {
	topics := []common.Hash{
		crypto.Keccak256Hash([]byte("ValidatorCreated(string,uint256)")),
		crypto.Keccak256Hash([]byte(validator)),
	}
	evm.StateDB.AddLog(&types.Log{
		Address: precompileAddr,
		Topics:  topics,
		Data:    amount.Bytes(),
	})
	return nil
}

// EmitValidatorEditedEvent emits a ValidatorEdited(string,uint256)
func EmitValidatorEditedEvent(evm *vm.EVM, precompileAddr common.Address, validator string, amount *big.Int) error {
	topics := []common.Hash{
		crypto.Keccak256Hash([]byte("ValidatorEdited(string,uint256)")),
		crypto.Keccak256Hash([]byte(validator)),
	}
	evm.StateDB.AddLog(&types.Log{
		Address: precompileAddr,
		Topics:  topics,
		Data:    amount.Bytes(),
	})
	return nil
}
