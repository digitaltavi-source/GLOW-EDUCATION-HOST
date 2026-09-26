import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createGlowMcpExpressApp, DEFAULT_MCP_JSON_LIMIT } from "../src/mcp-app.js";

async function withServer(run:(base:string)=>Promise<void>) {
  const app=createGlowMcpExpressApp(["127.0.0.1","localhost"]);
  app.post("/echo-size",(req,res)=>{
    const payload=(req.body ?? {}) as { pad?: string };
    res.json({size:typeof payload.pad==="string" ? payload.pad.length : 0});
  });
  const server=app.listen(0,"127.0.0.1");
  await new Promise<void>((resolve,reject)=>{
    server.once("listening",()=>resolve());
    server.once("error",reject);
  });
  try {
    const {port}=server.address() as AddressInfo;
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
}

test("MCP JSON body limit is explicitly bounded at 512kb", () => {
  assert.equal(DEFAULT_MCP_JSON_LIMIT,"512kb");
});

test("RECOVERY: H2-sized MCP payload above Express default 100kb is accepted", async () => {
  await withServer(async base=>{
    const response=await fetch(base+"/echo-size",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({pad:"x".repeat(140_000)})
    });
    assert.equal(response.status,200);
    const body=await response.json() as {size:number};
    assert.equal(body.size,140_000);
  });
});

test("ADVERSARIAL: MCP payload beyond bounded 512kb ceiling is rejected", async () => {
  await withServer(async base=>{
    const response=await fetch(base+"/echo-size",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({pad:"x".repeat(600_000)})
    });
    assert.equal(response.status,413);
  });
});
