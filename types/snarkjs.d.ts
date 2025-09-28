declare module "snarkjs" {
  export const groth16: {
    fullProve: (
      inputs: unknown,
      wasmPath: string,
      zkeyPath: string
    ) => Promise<{
      proof: unknown;
      publicSignals: unknown;
    }>;
  };
}
