import {
  computeAgeYears,
  computeBmi,
  computeBodyDensityJacksonPollock7,
  computeBodyFatPercentSiri,
  computeWaistHipRatio,
  sumSkinfoldsMm,
} from "./body-composition";

describe("sumSkinfoldsMm", () => {
  it("sums all 7 Pollock sites", () => {
    expect(
      sumSkinfoldsMm({
        chest: 10,
        midaxillary: 10,
        triceps: 10,
        subscapular: 10,
        abdominal: 10,
        suprailiac: 10,
        thigh: 10,
      }),
    ).toBe(70);
  });
});

describe("computeAgeYears", () => {
  const dob = new Date("1990-06-15T00:00:00.000Z");

  it("is one less than the naive year difference before the birthday", () => {
    expect(computeAgeYears(dob, new Date("2026-06-14T00:00:00.000Z"))).toBe(
      35,
    );
  });

  it("turns over on the exact birthday", () => {
    expect(computeAgeYears(dob, new Date("2026-06-15T00:00:00.000Z"))).toBe(
      36,
    );
  });

  it("stays turned over well after the birthday", () => {
    expect(computeAgeYears(dob, new Date("2026-12-25T00:00:00.000Z"))).toBe(
      36,
    );
  });
});

describe("computeBodyDensityJacksonPollock7 + computeBodyFatPercentSiri", () => {
  // Hand-computed: BD = 1.112 - 0.00043499*100 + 0.00000055*100^2 - 0.00028826*30
  //              = 1.112 - 0.043499 + 0.0055 - 0.0086478 = 1.0653532
  // %BF = 495/1.0653532 - 450 = 14.6346... -> rounds to 14.6
  it("computes the male formula for a 30-year-old, sum7=100mm", () => {
    const bd = computeBodyDensityJacksonPollock7({
      sum7Mm: 100,
      ageYears: 30,
      biologicalSex: "MALE",
    });
    expect(bd).toBeCloseTo(1.0653532, 6);
    expect(computeBodyFatPercentSiri(bd)).toBeCloseTo(14.6, 1);
  });

  // Hand-computed: BD = 1.097 - 0.00046971*120 + 0.00000056*120^2 - 0.00012828*25
  //              = 1.097 - 0.0563652 + 0.008064 - 0.003207 = 1.0454918
  // %BF = 495/1.0454918 - 450 = 23.4614... -> rounds to 23.5
  it("computes the female formula for a 25-year-old, sum7=120mm", () => {
    const bd = computeBodyDensityJacksonPollock7({
      sum7Mm: 120,
      ageYears: 25,
      biologicalSex: "FEMALE",
    });
    expect(bd).toBeCloseTo(1.0454918, 6);
    expect(computeBodyFatPercentSiri(bd)).toBeCloseTo(23.5, 1);
  });

  it("never returns more than one decimal of %BF precision (§5.3)", () => {
    const bd = computeBodyDensityJacksonPollock7({
      sum7Mm: 87,
      ageYears: 41,
      biologicalSex: "FEMALE",
    });
    const pct = computeBodyFatPercentSiri(bd);
    expect(Math.round(pct * 10) / 10).toBe(pct);
  });
});

describe("computeBmi", () => {
  // 80 / 1.78^2 = 80 / 3.1684 = 25.2493... -> rounds to 25.2
  it("computes weight/height^2 with height in cm converted to meters", () => {
    expect(computeBmi(80, 178)).toBeCloseTo(25.2, 1);
  });
});

describe("computeWaistHipRatio", () => {
  it("divides waist by hip", () => {
    expect(computeWaistHipRatio(85, 100)).toBe(0.85);
  });

  it("rounds to two decimals", () => {
    expect(computeWaistHipRatio(81, 97)).toBeCloseTo(0.84, 2);
  });
});
