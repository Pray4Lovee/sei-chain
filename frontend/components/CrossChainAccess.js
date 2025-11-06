'use strict';

const React = require('react');

const TRANSPORT_BY_CHAIN = {
  sei: 'ccip',
  polygon: 'ccip',
  solana: 'wormhole'
};

const TARGET_EVM_CHAIN = 'base';

function CrossChainAccess(props) {
  const { user } = props;
  const [originChain, setOriginChain] = React.useState('sei');
  const [status, setStatus] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const requestAccess = React.useCallback(async () => {
    setLoading(true);
    setStatus('');

    try {
      const proofResponse = await fetch('/api/soulkey/proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user,
          originChain,
          targetChain: TARGET_EVM_CHAIN
        })
      });

      const proofPayload = await proofResponse.json();
      const bridgeResponse = await fetch('/api/evm/grant-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user,
          originChain,
          targetChain: TARGET_EVM_CHAIN,
          transport: TRANSPORT_BY_CHAIN[originChain],
          proof: proofPayload.proof,
          publicSignals: proofPayload.publicSignals
        })
      });

      const result = await bridgeResponse.json();
      if (result.success) {
        setStatus(result.message || 'Access granted!');
      } else {
        setStatus(result.message || 'Access denied!');
      }
    } catch (error) {
      setStatus('Unable to complete cross-chain request');
    } finally {
      setLoading(false);
    }
  }, [user, originChain]);

  return React.createElement(
    'div',
    { className: 'cross-chain-access' },
    React.createElement(
      'label',
      { htmlFor: 'origin-chain-select' },
      'Origin chain'
    ),
    React.createElement(
      'select',
      {
        id: 'origin-chain-select',
        value: originChain,
        onChange: (event) => setOriginChain(event.target.value),
        'data-testid': 'origin-chain-select'
      },
      Object.keys(TRANSPORT_BY_CHAIN).map((chain) =>
        React.createElement(
          'option',
          { key: chain, value: chain },
          chain.charAt(0).toUpperCase() + chain.slice(1)
        )
      )
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        onClick: requestAccess,
        disabled: loading,
        'data-testid': 'request-button'
      },
      loading ? 'Requesting access…' : 'Request Vault Access'
    ),
    status
      ? React.createElement(
          'p',
          { 'data-testid': 'status-message' },
          status
        )
      : null
  );
}

module.exports = CrossChainAccess;
