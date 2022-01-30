import subprocess
import os
import shutil
import re
import json
from contextlib import contextmanager

OWNER = "tituszban.testnet"

def call(arguments):
    result = subprocess.run(arguments, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout = result.stdout.decode()
    print(stdout)
    return stdout

def build():
    if os.path.isdir("./neardev"):
        shutil.rmtree("./neardev")

    print("===== Building release version =====")
    call(["yarn", "build:release"])

def init_contract():
    print("===== Deploying contract to testnet =====")
    result = call(["near", "dev-deploy", "./build/release/donation-dao.wasm"])
    return re.findall(r"Account id: (dev-\d+-\d+),", result.split("\n")[0])[0]

def delete_contract(contract_id):
    print("===== Deleting contract =====")
    call(["near", "delete", contract_id, OWNER])

@contextmanager
def smart_contract():
    build()

    contract_id = init_contract()

    try:
        yield contract_id
    finally:
        delete_contract(contract_id)

def call_contract(contract_id, function, data=None, account_id=OWNER, amount=None):
    print(f"===== Calling {function} =====")
    args = ["near", "call", contract_id, function]
    if data:
        args.append(json.dumps(data))
    args.extend(["--accountId", account_id])
    if amount:
        args.extend(["--amount", amount])
    return call(args)

def create_contract():
    with smart_contract() as contract_id:
        call_contract(contract_id, "init", {"owner": OWNER}, account_id=contract_id)

        call_contract(contract_id, "get_beneficiaries")    


def main():
    create_contract()

if __name__ == "__main__":
    main()