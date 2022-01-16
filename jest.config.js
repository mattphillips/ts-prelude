module.exports = {
  roots: ["<rootDir>"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "test/.*\\.test\\.tsx?$",
  moduleFileExtensions: ["js", "ts"],
  moduleNameMapper: {
    "^src/(.*)": "<rootDir>/src/$1",
  },

  collectCoverageFrom: ["<rootDir>/**/src/**"],
};
