import { VMContext, u128 } from "near-sdk-as";
import { ONE_NEAR } from "../../utils";

import { Beneficiaries } from "../assembly/models";

const owner = "tb";

let beneficiaries: Beneficiaries

beforeEach(() => {
    beneficiaries = new Beneficiaries(owner);
})

describe("get_donation_shares", () => {

    it("only owner created gets all shares", () => {
        let donation = u128.mul(ONE_NEAR, u128.from(1));
        let shares = beneficiaries.get_donation_shares(donation);

        expect(shares).toHaveLength(1);

        let ownerShare = shares[0];
        expect(ownerShare.account).toBe(owner);
        expect(ownerShare.share).toBe(donation);
    })
})