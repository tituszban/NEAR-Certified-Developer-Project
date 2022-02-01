import subprocess
import os
import shutil
import re
import json
from contextlib import contextmanager
import time
import argparse


parser = argparse.ArgumentParser(description="Contract driver for donation-dao testing")
parser.add_argument("owner", type=str, help="Name of the account that owns the contract; e.g.: tituszban.testnet")
parser.add_argument("user", type=str, help="Name of the account that is added to the contract; e.g.: dev1.tituszban.testnet")


def call(arguments):
    result = subprocess.run(arguments, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout = result.stdout.decode()
    print(stdout)
    stderr = result.stderr.decode()
    if stderr:
        print("Error:")
        print(stderr)
        raise Exception()
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


def delete_contract(contract_id, beneficiary):
    print("===== Deleting contract =====")
    call(["near", "delete", contract_id, beneficiary])


@contextmanager
def smart_contract(owner):
    build()

    contract_id = init_contract()

    try:
        yield contract_id
    finally:
        delete_contract(contract_id, owner)

def call_contract(contract_id, function, account_id, data=None, amount=None):
    print(f"===== Calling {function} =====")
    args = ["near", "call", contract_id, function]
    if data:
        args.append(json.dumps(data))
    args.extend(["--accountId", account_id])
    if amount:
        args.extend(["--amount", str(amount)])
    return call(args)

def create_contract(owner, user):
    with smart_contract(owner) as contract_id:
        call_contract(contract_id, "init", account_id=contract_id, data={"owner": owner})

        call_contract(contract_id, "get_beneficiaries", account_id=owner)

        call_contract(contract_id, "donate", account_id=owner, amount=1)

        call_contract(contract_id, "create_add_beneficiary_proposal", account_id=owner, data={
            "deadline": int(time.time()) + 600, # 10 minutes
            "account": user,
            "share": 50,
            "isAuthoriser": False
        })

        call_contract(contract_id, "get_proposals", account_id=owner, data={"activeOnly": True})

        call_contract(contract_id, "approve_proposal", account_id=owner, data={"proposalId": 0})

        call_contract(contract_id, "finalise_proposals", account_id=owner)

        call_contract(contract_id, "get_proposals", account_id=owner, data={"activeOnly": True})

        call_contract(contract_id, "get_beneficiaries", account_id=owner)

        call_contract(contract_id, "donate", account_id=owner, amount=1)




def main():
    args = parser.parse_args()
    create_contract(args.owner, args.user)

if __name__ == "__main__":
    main()