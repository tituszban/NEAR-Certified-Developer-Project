import { PersistentVector } from "near-sdk-as";

@nearBindgen
class Base {
    constructor(
        public value1: u64
    ) { }
}

@nearBindgen
class Child extends Base {
    constructor(
        value1: u64,
        public value2: u64
    ) {
        super(value1);
    }
}


@nearBindgen
export class Contract {
    private pers: PersistentVector<Base> = new PersistentVector<Base>("vec");

    add(value1: u64, value2: u64): Child {
        const c = new Child(value1, value2);
        this.pers.pushBack(c);
        return c;
    }

    get(): Array<Base> {
        const res: Array<Base> = [];

        for (let i = 0; i < this.pers.length; i++) {
            res.push(this.pers[i]);
        }
        return res;
    }
}