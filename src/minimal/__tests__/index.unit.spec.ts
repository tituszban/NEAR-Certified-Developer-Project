import { Contract } from "../assembly/index";

let cont: Contract

beforeEach(() => {
    cont = new Contract();
})

// describe("Contract", () => {

//     it("add returns correct value", () => {
//         const result = cont.add(7, 3);
//         expect(result.value1).toBe(7);
//         expect(result.value2).toBe(3);
//     });

//     it("get after add returns 1 correct value", () => {
//         cont.add(7, 3);

//         const results = cont.get();
//         expect(results).toHaveLength(1);
//         const result = results[0];
//         expect(result.value1).toBe(7);
//     });
// })