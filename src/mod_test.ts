import { assertExists } from "@std/assert";
import { MCPServerWrapper } from "./mod.ts";

Deno.test("MCPServerWrapper - Constructor", () => {
  const wrapper = new MCPServerWrapper({
    serverUrl: "./test-server.ts",
    allowedTools: ["tool1", "tool2"],
  });

  assertExists(wrapper);
});
