"""KunoWorld gateway: the platform API between customers and attested miner enclaves.

It never holds a key that can decrypt customer content. It prices, routes and
queues sealed jobs, stores ciphertext blobs, checks attestation, and records
enclave-signed receipts.
"""

__version__ = "0.1.0"
