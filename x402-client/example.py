from x402_client import X402Client

client = X402Client("http://127.0.0.1:4020")
response = client.request()
print(response.status_code, response.text)
