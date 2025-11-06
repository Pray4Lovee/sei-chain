const { expect } = require('chai');
const snarkjs = require('snarkjs');
const { proofFixtures } = require('./fixtures/crossChainProofFixtures');

class MockZkMultiFactorProofVerifier {
  constructor(fixtures) {
    this.allowedProofs = new Map(
      fixtures.map((fixture) => [`${fixture.originChain}:${fixture.user}`, fixture])
    );
  }

  async verifyProof(originChain, user, proof, publicSignals) {
    const fixture = this.allowedProofs.get(`${originChain}:${user}`);
    if (!fixture) {
      return false;
    }

    const proofMatches = fixture.proof.commitment === proof.commitment;
    const hashMatches = fixture.publicSignals.signalHash === publicSignals.signalHash;
    const nullifierMatches =
      snarkjs.bigInt(fixture.publicSignals.nullifier).toString() ===
      snarkjs.bigInt(publicSignals.nullifier).toString();

    return proofMatches && hashMatches && nullifierMatches;
  }
}

class CrossChainSoulKeyGateMock {
  constructor(verifier) {
    this.verifier = verifier;
    this.accessRecords = new Map();
    this.allowedTransports = {
      sei: 'ccip',
      polygon: 'ccip',
      solana: 'wormhole'
    };
  }

  async grantAccessFromCrossChain(request) {
    const { user, originChain, proof, publicSignals, transport } = request;
    const expectedTransport = this.allowedTransports[originChain];
    if (!expectedTransport) {
      throw new Error(`Unsupported origin chain: ${originChain}`);
    }

    if (transport !== expectedTransport) {
      throw new Error(`Invalid transport for ${originChain}`);
    }

    const valid = await this.verifier.verifyProof(originChain, user, proof, publicSignals);
    if (!valid) {
      throw new Error(`Invalid zk proof from ${originChain}`);
    }

    const normalizedNullifier = snarkjs.bigInt(publicSignals.nullifier).toString();
    this.accessRecords.set(user, {
      originChain,
      targetChain: publicSignals.targetChain,
      transport,
      vaultId: publicSignals.vaultId,
      nullifier: normalizedNullifier,
      proofCommitment: proof.commitment
    });

    return true;
  }

  accessVault(user) {
    return this.accessRecords.has(user);
  }

  getAccessRecord(user) {
    return this.accessRecords.get(user) || null;
  }

  reset() {
    this.accessRecords.clear();
  }
}

describe('Cross-Chain SoulKey Validation', function () {
  let gate;
  let verifier;

  beforeEach(function () {
    verifier = new MockZkMultiFactorProofVerifier(proofFixtures);
    gate = new CrossChainSoulKeyGateMock(verifier);
  });

  afterEach(function () {
    gate.reset();
  });

  it('grants access with a valid Sei zk proof via CCIP', async function () {
    const seiFixture = proofFixtures.find((fixture) => fixture.originChain === 'sei');
    const request = {
      user: seiFixture.user,
      originChain: seiFixture.originChain,
      proof: { ...seiFixture.proof },
      publicSignals: { ...seiFixture.publicSignals },
      transport: seiFixture.transport
    };

    await gate.grantAccessFromCrossChain(request);

    expect(gate.accessVault(seiFixture.user)).to.equal(true);
    const record = gate.getAccessRecord(seiFixture.user);
    expect(record).to.include({
      originChain: 'sei',
      targetChain: 'base',
      transport: 'ccip',
      vaultId: 'vault-galaxy'
    });
    expect(record.nullifier).to.equal('1');
  });

  it('rejects invalid Solana proofs delivered through Wormhole', async function () {
    const solanaFixture = proofFixtures.find((fixture) => fixture.originChain === 'solana');
    const invalidRequest = {
      user: solanaFixture.user,
      originChain: solanaFixture.originChain,
      proof: { commitment: 'tampered-proof' },
      publicSignals: { ...solanaFixture.publicSignals },
      transport: solanaFixture.transport
    };

    try {
      await gate.grantAccessFromCrossChain(invalidRequest);
      expect.fail('Expected invalid proof rejection');
    } catch (error) {
      expect(error.message).to.include('Invalid zk proof');
      expect(gate.accessVault(solanaFixture.user)).to.equal(false);
    }
  });

  it('confirms multi-chain eligibility for Polygon and Solana SoulKeys', async function () {
    const polygonFixture = proofFixtures.find((fixture) => fixture.originChain === 'polygon');
    const solanaFixture = proofFixtures.find((fixture) => fixture.originChain === 'solana');

    await gate.grantAccessFromCrossChain({
      user: polygonFixture.user,
      originChain: polygonFixture.originChain,
      proof: { ...polygonFixture.proof },
      publicSignals: { ...polygonFixture.publicSignals },
      transport: polygonFixture.transport
    });

    await gate.grantAccessFromCrossChain({
      user: solanaFixture.user,
      originChain: solanaFixture.originChain,
      proof: { ...solanaFixture.proof },
      publicSignals: { ...solanaFixture.publicSignals },
      transport: solanaFixture.transport
    });

    const polygonRecord = gate.getAccessRecord(polygonFixture.user);
    const solanaRecord = gate.getAccessRecord(solanaFixture.user);

    expect(polygonRecord.targetChain).to.equal('arbitrum');
    expect(solanaRecord.targetChain).to.equal('base');
    expect(polygonRecord.transport).to.equal('ccip');
    expect(solanaRecord.transport).to.equal('wormhole');
    expect(gate.accessVault(polygonFixture.user)).to.equal(true);
    expect(gate.accessVault(solanaFixture.user)).to.equal(true);
  });
});
