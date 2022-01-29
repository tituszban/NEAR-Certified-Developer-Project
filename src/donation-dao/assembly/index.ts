import { logging, Context, u128, ContractPromiseBatch, PersistentSet } from "near-sdk-as";

import { AccountId, ONE_NEAR, asNEAR, XCC_GAS } from "../../utils";

@nearBindgen
export class Contract {
    private owner: AccountId;

    constructor(owner: AccountId) {
        this.owner = owner;
    }

    get_owner(): AccountId {
        return this.owner;
    }
}