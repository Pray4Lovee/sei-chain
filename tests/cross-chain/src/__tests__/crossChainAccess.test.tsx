import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CrossChainAccess from "../components/CrossChainAccess";

describe("CrossChainAccess", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("allows a user to request vault access successfully", async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ proof: "0xproof", publicSignals: "0xsignals" })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, message: "Access granted!" })
      });
    global.fetch = mockFetch as unknown as typeof fetch;

    render(<CrossChainAccess user="0xTestUserAddress" />);

    const button = screen.getByRole("button", { name: /request vault access/i });
    fireEvent.click(button);

    const successMessage = await screen.findByText(/Access granted!/i);
    expect(successMessage).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("surfaces an error when the proof is invalid", async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ proof: "0xinvalid", publicSignals: "0xsignals" })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: false, message: "Access denied!" })
      });
    global.fetch = mockFetch as unknown as typeof fetch;

    render(<CrossChainAccess user="0xTestUserAddress" />);

    const button = screen.getByRole("button", { name: /request vault access/i });
    fireEvent.click(button);

    const errorMessage = await screen.findByText(/Access denied!/i);
    expect(errorMessage).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("sends chain metadata when requesting access from polygon", async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ proof: "0xpolygon", publicSignals: "0xpolygon-signals" })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, message: "Access granted!" })
      });
    global.fetch = mockFetch as unknown as typeof fetch;

    render(<CrossChainAccess user="0xTestUserAddress" />);

    fireEvent.change(screen.getByTestId("chain-select"), { target: { value: "polygon" } });
    fireEvent.click(screen.getByRole("button", { name: /request vault access/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    const [, secondCall] = mockFetch.mock.calls;
    const requestBody = JSON.parse(secondCall[1].body as string);
    expect(requestBody.sourceChain).toEqual("polygon");
    expect(requestBody.user).toEqual("0xTestUserAddress");
  });
});
