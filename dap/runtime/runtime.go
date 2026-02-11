package runtime

// Runtime describes the end-to-end DAP assembly in Sei-native terminology.
type Runtime struct {
	SystemKernel   string
	PoolGuardian   string
	OriginResolver string
	SignalMesh     string
	SoulSync       string
	GenZK402       string
}

func New() Runtime {
	return Runtime{
		SystemKernel:   "sei-system-kernel",
		PoolGuardian:   "dap-pool-guardian",
		OriginResolver: "dap-origin-resolver",
		SignalMesh:     "dap-signal-mesh",
		SoulSync:       "dap-soul-sync",
		GenZK402:       "dap-genzk402",
	}
}
