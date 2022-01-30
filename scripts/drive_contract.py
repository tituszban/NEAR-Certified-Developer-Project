import subprocess
import os
import shutil
import re
import json

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

def call_contract(contract_id, function, data, account_id=OWNER):
    print(f"===== Calling {function} =====")
    return call(["near", "call", contract_id, function, json.dumps(data), "--accountId", account_id])

def create_contract():
    build()

    contract_id = init_contract()

    call_contract(contract_id, "init", {"owner": OWNER}, account_id=contract_id)

    call_contract(contract_id, "get_beneficiaries", {})

    delete_contract(contract_id)


def main():
    create_contract()

if __name__ == "__main__":
    main()