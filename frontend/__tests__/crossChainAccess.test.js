const React = require('react');
const ReactDOM = require('react-dom');
const TestUtils = require('react-dom/test-utils');
const CrossChainAccess = require('../components/CrossChainAccess');

describe('CrossChainAccess component', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    }
    container = null;
    jest.resetAllMocks();
    delete global.fetch;
  });

  test('requests proof and grants vault access on success', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            proof: ['proof-a', 'proof-b', 'proof-c'],
            publicSignals: { signalHash: '0xabc', vaultId: 'vault-galaxy' }
          })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, message: 'Access granted!' })
      });

    await TestUtils.act(async () => {
      ReactDOM.render(React.createElement(CrossChainAccess, { user: '0xTestUser' }), container);
    });

    const button = container.querySelector('[data-testid="request-button"]');
    expect(button).not.toBeNull();

    await TestUtils.act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const status = container.querySelector('[data-testid="status-message"]');
    expect(status).not.toBeNull();
    expect(status.textContent).toBe('Access granted!');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/soulkey/proof');
    expect(global.fetch.mock.calls[1][0]).toBe('/api/evm/grant-access');
  });

  test('notifies user when zk proof submission fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network error'));

    await TestUtils.act(async () => {
      ReactDOM.render(React.createElement(CrossChainAccess, { user: '0xTestUser' }), container);
    });

    const button = container.querySelector('[data-testid="request-button"]');

    await TestUtils.act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const status = container.querySelector('[data-testid="status-message"]');
    expect(status).not.toBeNull();
    expect(status.textContent).toBe('Unable to complete cross-chain request');
  });

  test('denies access when verifier returns a failure', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            proof: ['proof-a', 'proof-b', 'proof-c'],
            publicSignals: { signalHash: '0xabc', vaultId: 'vault-galaxy' }
          })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, message: 'Access denied!' })
      });

    await TestUtils.act(async () => {
      ReactDOM.render(React.createElement(CrossChainAccess, { user: '0xTestUser' }), container);
    });

    const button = container.querySelector('[data-testid="request-button"]');

    await TestUtils.act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const status = container.querySelector('[data-testid="status-message"]');
    expect(status).not.toBeNull();
    expect(status.textContent).toBe('Access denied!');
  });
});
