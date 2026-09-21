import { matchContraindications } from "./contraindication-cross-check";

describe("matchContraindications", () => {
  it("returns the exercise tags that overlap the client's profile", () => {
    expect(
      matchContraindications(
        ["LOWER_BACK_LOAD_CAUTION", "WRIST_LOAD_CAUTION"],
        ["LOWER_BACK_LOAD_CAUTION"],
      ),
    ).toEqual(["LOWER_BACK_LOAD_CAUTION"]);
  });

  it("returns an empty array when there is no overlap", () => {
    expect(matchContraindications(["KNEE_LOAD_CAUTION"], ["NECK_STRAIN_CAUTION"])).toEqual(
      [],
    );
  });

  it("returns an empty array when either side is empty", () => {
    expect(matchContraindications([], ["LOWER_BACK_LOAD_CAUTION"])).toEqual([]);
    expect(matchContraindications(["LOWER_BACK_LOAD_CAUTION"], [])).toEqual([]);
  });
});
