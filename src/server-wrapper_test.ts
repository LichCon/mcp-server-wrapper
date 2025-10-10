import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  returnsNext,
  stub,
} from "https://deno.land/std@0.224.0/testing/mock.ts";
import { MCPServerWrapper } from "./server-wrapper.ts";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Mock the Deno.Command
class MockChildProcess {
  kill() {}
}

Deno.test("MCPServerWrapper with Mocks", async (t) => {
  await t.step(
    "should filter tools and proxy allowed tool calls",
    async () => {
      const commandStub = stub(
        Deno,
        "Command",
        returnsNext([
          {
            spawn: () => new MockChildProcess(),
          } as any,
        ])
      );
      const clientConnectStub = stub(Client.prototype, "connect", () =>
        Promise.resolve()
      );
      const listToolsStub = stub(
        Client.prototype,
        "listTools",
        () =>
          Promise.resolve({
            tools: [
              { name: "allowed-tool", description: "An allowed tool" },
              { name: "disallowed-tool", description: "A disallowed tool" },
            ],
          }) as any
      );
      const callToolStub = stub(
        Client.prototype,
        "callTool",
        (req: any) => {
          if (req.name === "allowed-tool") {
            return Promise.resolve({
              content: [{ type: "text", text: "tool-output" }],
            }) as any;
          }
          return Promise.reject(new Error("Should not be called"));
        }
      );
      const serverConnectStub = stub(Server.prototype, "connect", () =>
        Promise.resolve()
      );
      const setRequestHandlerStub = stub(
        Server.prototype,
        "setRequestHandler"
      );

      try {
        const wrapper = new MCPServerWrapper({
          serverUrl: "./test-server.ts",
          allowedTools: ["allowed-tool"],
        });
        await wrapper.start();

        const listToolsHandler = setRequestHandlerStub.calls.find(
          (c) => c.args[0] === ListToolsRequestSchema
        )?.args[1] as () => Promise<{ tools: any[] }>;
        assert(listToolsHandler, "listTools handler not set");
        const filteredToolsResponse = await listToolsHandler();
        assertEquals(filteredToolsResponse.tools.length, 1);
        assertEquals(filteredToolsResponse.tools[0].name, "allowed-tool");

        const callToolHandler = setRequestHandlerStub.calls.find(
          (c) => c.args[0] === CallToolRequestSchema
        )?.args[1] as (req: any) => Promise<any>;
        assert(callToolHandler, "callTool handler not set");
        const callToolResponse = await callToolHandler({
          params: { name: "allowed-tool", arguments: {} },
        });
        assertEquals(
          (callToolResponse.content as any)[0].text,
          "tool-output"
        );

        await assertRejects(
          () =>
            callToolHandler({
              params: { name: "disallowed-tool", arguments: {} },
            }),
          Error,
          "Tool not found: disallowed-tool"
        );
      } finally {
        commandStub.restore();
        clientConnectStub.restore();
        listToolsStub.restore();
        callToolStub.restore();
        serverConnectStub.restore();
        setRequestHandlerStub.restore();
      }
    }
  );

  await t.step("should handle no allowed tools", async () => {
    const commandStub = stub(
      Deno,
      "Command",
      returnsNext([
        {
          spawn: () => new MockChildProcess(),
        } as any,
      ])
    );
    const clientConnectStub = stub(Client.prototype, "connect", () =>
      Promise.resolve()
    );
    const listToolsStub = stub(
      Client.prototype,
      "listTools",
      () =>
        Promise.resolve({
          tools: [{ name: "some-tool", description: "A tool" }],
        }) as any
    );
    const serverConnectStub = stub(Server.prototype, "connect", () =>
      Promise.resolve()
    );
    const setRequestHandlerStub = stub(
      Server.prototype,
      "setRequestHandler"
    );

    try {
      const wrapper = new MCPServerWrapper({
        serverUrl: "./test-server.ts",
        allowedTools: [],
      });
      await wrapper.start();

      const listToolsHandler = setRequestHandlerStub.calls.find(
        (c) => c.args[0] === ListToolsRequestSchema
      )?.args[1] as () => Promise<{ tools: any[] }>;
      assert(listToolsHandler, "listTools handler not set");
      const filteredToolsResponse = await listToolsHandler();
      assertEquals(filteredToolsResponse.tools.length, 0);
    } finally {
      commandStub.restore();
      clientConnectStub.restore();
      listToolsStub.restore();
      serverConnectStub.restore();
      setRequestHandlerStub.restore();
    }
  });

  await t.step("should handle upstream connection failure", async () => {
    const commandStub = stub(
      Deno,
      "Command",
      returnsNext([
        {
          spawn: () => new MockChildProcess(),
        } as any,
      ])
    );
    const clientConnectStub = stub(Client.prototype, "connect", () =>
      Promise.reject(new Error("Connection failed"))
    );

    try {
      const wrapper = new MCPServerWrapper({
        serverUrl: "./test-server.ts",
        allowedTools: ["any-tool"],
      });

      await assertRejects(
        () => wrapper.start(),
        Error,
        "Failed to start MCP server wrapper: Error: Failed to connect to server at ./test-server.ts: Error: Connection failed"
      );
    } finally {
      commandStub.restore();
      clientConnectStub.restore();
    }
  });

  await t.step("stop should call cleanup", async () => {
    const commandStub = stub(
      Deno,
      "Command",
      returnsNext([
        {
          spawn: () => new MockChildProcess(),
        } as any,
      ])
    );
    const clientConnectStub = stub(Client.prototype, "connect", () =>
      Promise.resolve()
    );
    const listToolsStub = stub(
      Client.prototype,
      "listTools",
      () => Promise.resolve({ tools: [] }) as any
    );
    const serverConnectStub = stub(Server.prototype, "connect", () =>
      Promise.resolve()
    );
    const setRequestHandlerStub = stub(
      Server.prototype,
      "setRequestHandler"
    );
    const clientCloseStub = stub(Client.prototype, "close", () =>
      Promise.resolve()
    );
    const serverCloseStub = stub(Server.prototype, "close", () =>
      Promise.resolve()
    );

    try {
      const wrapper = new MCPServerWrapper({
        serverUrl: "./test-server.ts",
        allowedTools: [],
      });
      await wrapper.start();
      await wrapper.stop();

      assertEquals(clientCloseStub.calls.length, 1);
      assertEquals(serverCloseStub.calls.length, 1);
    } finally {
      commandStub.restore();
      clientConnectStub.restore();
      listToolsStub.restore();
      serverConnectStub.restore();
      setRequestHandlerStub.restore();
      clientCloseStub.restore();
      serverCloseStub.restore();
    }
  });
});