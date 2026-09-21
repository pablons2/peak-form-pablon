import { mapIntakeToContraindicationTags } from "./map-intake-to-contraindication-tags";

describe("mapIntakeToContraindicationTags", () => {
  it("maps a CURRENT pain flag to its region's contraindication tag", () => {
    const tags = mapIntakeToContraindicationTags({
      parqAnswers: {},
      painFlags: [{ region: "LOWER_BACK", severity: 6, pastOrCurrent: "CURRENT" }],
      medicalConditions: [],
    });
    expect(tags).toEqual(["LOWER_BACK_LOAD_CAUTION"]);
  });

  it("does not map a PAST-only pain flag", () => {
    const tags = mapIntakeToContraindicationTags({
      parqAnswers: {},
      painFlags: [{ region: "LOWER_BACK", severity: 6, pastOrCurrent: "PAST" }],
      medicalConditions: [],
    });
    expect(tags).toEqual([]);
  });

  it("maps a 'yes' PAR-Q answer to its tag", () => {
    const tags = mapIntakeToContraindicationTags({
      parqAnswers: { BLOOD_PRESSURE_MEDICATION: true },
      painFlags: [],
      medicalConditions: [],
    });
    expect(tags).toEqual(["BLOOD_PRESSURE_CAUTION"]);
  });

  it("ignores a 'no' PAR-Q answer", () => {
    const tags = mapIntakeToContraindicationTags({
      parqAnswers: { BLOOD_PRESSURE_MEDICATION: false },
      painFlags: [],
      medicalConditions: [],
    });
    expect(tags).toEqual([]);
  });

  it("maps a medical condition to its tag", () => {
    const tags = mapIntakeToContraindicationTags({
      parqAnswers: {},
      painFlags: [],
      medicalConditions: ["PREGNANCY"],
    });
    expect(tags).toEqual(["HIGH_IMPACT_CAUTION"]);
  });

  it("does not map conditions/regions/questions with no defined tag", () => {
    const tags = mapIntakeToContraindicationTags({
      parqAnswers: { BONE_JOINT_PROBLEM: true },
      painFlags: [{ region: "CHEST", severity: 3, pastOrCurrent: "CURRENT" }],
      medicalConditions: ["DIABETES"],
    });
    expect(tags).toEqual([]);
  });

  it("de-duplicates tags reached from multiple sources", () => {
    const tags = mapIntakeToContraindicationTags({
      parqAnswers: { HEART_CONDITION: true },
      painFlags: [],
      medicalConditions: ["CARDIOVASCULAR_DISEASE"],
    });
    expect(tags).toEqual(["BLOOD_PRESSURE_CAUTION"]);
  });

  it("returns an empty array for empty input", () => {
    expect(
      mapIntakeToContraindicationTags({
        parqAnswers: null,
        painFlags: null,
        medicalConditions: null,
      }),
    ).toEqual([]);
  });
});
