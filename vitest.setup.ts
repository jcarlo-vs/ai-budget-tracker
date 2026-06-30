import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: false });
import "fake-indexeddb/auto";
