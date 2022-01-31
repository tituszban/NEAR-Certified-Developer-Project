import { VMContext, u128 } from "near-sdk-as";
import { ONE_NEAR } from "../../utils";

import { Contract } from "../assembly/index";

const NANOSECONDS: u64 = 1_000_000_000;

const contract = "donation.dao";
const owner = "tb";
const user1 = "user1";
const user2 = "user2";

let donDao: Contract

beforeEach(() => {
    VMContext.setCurrent_account_id(contract);
    VMContext.setAccount_balance(ONE_NEAR); // resolves HostError(BalanceExceeded)
    donDao = new Contract(owner);
})

describe("get_beneficiaries", () => {

    it("has owner as starting beneficiary", () => {
        const beneficiaries = donDao.get_beneficiaries();
        expect(beneficiaries).toHaveLength(1);
        expect(beneficiaries[0].account).toBe(owner);
        expect(beneficiaries[0].share).toBe(100);
        expect(beneficiaries[0].isAuthoriser).toBe(true);
    });
})

describe("get_proposals", () => {
    it("has no proposals initially", () => {
        const proposals = donDao.get_proposals(false);
        expect(proposals).toHaveLength(0);
    });
})

describe("full voting cycles", () => {
    it("add new beneficiary, passes", () => {
        VMContext.setBlock_timestamp(0);
        VMContext.setSigner_account_id(owner);
        donDao.create_add_beneficiary_proposal(100, user1, 10, false);
        donDao.approve_proposal(0);
        const result = donDao.finalise_proposals()

        expect(result).toHaveLength(1);
        expect(result[0]).toBe("Proposal #0: PASSED")
    })

    it("add new beneficiary, fails", () => {
        VMContext.setBlock_timestamp(0);
        VMContext.setSigner_account_id(owner);
        donDao.create_add_beneficiary_proposal(100, user1, 10, false);
        VMContext.setBlock_timestamp(120 * NANOSECONDS);
        const result = donDao.finalise_proposals()

        expect(result).toHaveLength(1);
        expect(result[0]).toBe("Proposal #0: FAILED")
    })
})