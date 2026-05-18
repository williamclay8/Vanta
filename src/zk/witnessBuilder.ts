// Highly optimized witness builder to minimize intermediate object creation

export class WitnessBuilder {
  private fields: bigint[];
  private index: number;

  constructor(expectedSize: number) {
    this.fields = new Array(expectedSize);
    this.index = 0;
  }

  add(value: bigint | string | number) {
    this.fields[this.index++] = BigInt(value);
  }

  addMany(values: (bigint | string | number)[]) {
    for (let i = 0; i < values.length; i++) {
      this.fields[this.index++] = BigInt(values[i]);
    }
  }

  build(): bigint[] {
    const result = new Array(this.index);
    for (let i = 0; i < this.index; i++) {
      result[i] = this.fields[i];
    }
    return result;
  }

  reset() {
    this.index = 0;
  }
}

// Specialized fast builder for Swap (pre-allocated, minimal allocations)
export class SwapWitnessBuilder {
  private fields: bigint[];
  private index: number;

  constructor() {
    this.fields = new Array(2048); // generous pre-allocation
    this.index = 0;
  }

  add(value: bigint) {
    this.fields[this.index++] = value;
  }

  addMany(values: bigint[]) {
    for (let i = 0; i < values.length; i++) {
      this.fields[this.index++] = values[i];
    }
  }

  build(): bigint[] {
    const result = new Array(this.index);
    for (let i = 0; i < this.index; i++) {
      result[i] = this.fields[i];
    }
    return result;
  }

  reset() {
    this.index = 0;
  }
}