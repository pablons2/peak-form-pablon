import { isSessionComplete } from "./session-completion";

describe("isSessionComplete", () => {
  it("is false for a Session with no prescribed exercises", () => {
    expect(isSessionComplete([])).toBe(false);
  });

  it("is true when every exercise has at least its target sets logged", () => {
    expect(
      isSessionComplete([
        { sessionExerciseId: "a", targetSets: 3, loggedSets: 3 },
        { sessionExerciseId: "b", targetSets: 4, loggedSets: 4 },
      ]),
    ).toBe(true);
  });

  it("is false when one exercise is short of its target", () => {
    expect(
      isSessionComplete([
        { sessionExerciseId: "a", targetSets: 3, loggedSets: 3 },
        { sessionExerciseId: "b", targetSets: 4, loggedSets: 2 },
      ]),
    ).toBe(false);
  });

  it("is false when an exercise has zero logged sets", () => {
    expect(
      isSessionComplete([{ sessionExerciseId: "a", targetSets: 3, loggedSets: 0 }]),
    ).toBe(false);
  });

  it("is true when an exercise has more sets logged than prescribed (extra set)", () => {
    expect(
      isSessionComplete([{ sessionExerciseId: "a", targetSets: 3, loggedSets: 5 }]),
    ).toBe(true);
  });
});
