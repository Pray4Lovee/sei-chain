import datetime
import hashlib
import json


class OmegaGuardian:
    def seal(self, payload: dict):
        payload["timestamp"] = datetime.datetime.utcnow().isoformat()
        encoded = json.dumps(payload, sort_keys=True).encode()
        return hashlib.sha256(encoded).hexdigest()


if __name__ == "__main__":
    og = OmegaGuardian()
    seal_hash = og.seal({"author": "Pray4Love1", "module": "SeiGiga"})
    print("Omega Seal:", seal_hash)
