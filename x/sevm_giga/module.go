package sevm_giga

import "github.com/cosmos/cosmos-sdk/types/module"

type AppModule struct {
	keeper Keeper
}

func NewAppModule(k Keeper) AppModule {
	return AppModule{keeper: k}
}

func (am AppModule) Name() string { return "sevm_giga" }

func (am AppModule) RegisterServices(cfg module.Configurator) {
	RegisterMsgServer(cfg.MsgServer(), am.keeper)
}
