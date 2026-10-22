const targets = await (await fetch("http://127.0.0.1:9223/json")).json();
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("Chrome page target not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let requestId = 0;
const pending = new Map();
let dialogMessage = "";
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Page.javascriptDialogOpening") {
    dialogMessage = message.params.message;
    command("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
    return;
  }
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});
function command(method, params = {}) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, message, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(message);
}
async function clickText(text) {
  const found = await evaluate(`(() => {
    const element = [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === ${JSON.stringify(text)});
    if (!element) return false;
    element.click(); return true;
  })()`);
  if (!found) throw new Error(`Button not found: ${text}`);
}
async function setField(name, value) {
  const found = await evaluate(`(() => {
    const element = document.querySelector('[name=${JSON.stringify(name)}]');
    if (!element) return false;
    const setter = Object.getOwnPropertyDescriptor(element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set;
    setter.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!found) throw new Error(`Field not found: ${name}`);
}

await command("Runtime.enable");
await command("Page.enable");
await command("Page.navigate", { url: "http://localhost:3100/login" });
await waitFor("document.querySelector('button')?.textContent.includes('Sign in')", "Login form did not load");
await clickText("Sign in");
await waitFor("location.pathname === '/' && document.body.textContent.includes('Dashboard')", "Login did not complete");

const suffix = new Date().toISOString().replace(/\D/g, "").slice(2, 14);
const area = `UI Test Area ${suffix}`;
const village = `UI Test Village ${suffix}`;
const customer = `UI Test Customer ${suffix}`;

await clickText("Areas");
await waitFor("document.body.textContent.includes('Add Area')", "Areas screen did not load");
await clickText("Add Area");
await setField("name", area);
await clickText("Save Area");
await waitFor(`document.body.textContent.includes(${JSON.stringify(area)})`, "Area was not saved");

await clickText("Villages");
await waitFor("document.body.textContent.includes('Add Village')", "Villages screen did not load");
await clickText("Add Village");
await waitFor(`(() => [...document.querySelector('[name="area_id"]')?.options || []].some((option) => option.textContent.trim() === ${JSON.stringify(area)}))()`, "New area did not load into the village form");
const areaId = await evaluate(`(() => [...document.querySelector('[name="area_id"]').options].find((option) => option.textContent.trim() === ${JSON.stringify(area)})?.value)()`);
if (!areaId) {
  const options = await evaluate(`(() => [...document.querySelector('[name="area_id"]')?.options || []].map((option) => option.textContent.trim()))()`);
  throw new Error(`New area was not available in the village form. Options: ${JSON.stringify(options)}`);
}
await setField("area_id", areaId);
await setField("name", village);
await clickText("Save Village");
await waitFor(`document.body.textContent.includes(${JSON.stringify(village)})`, "Village was not saved");

await clickText("Customers");
await waitFor("document.body.textContent.includes('Customer setup')", "Customers screen did not load");
await clickText("Add");
await setField("name", customer);
await setField("phone", "01700000000");
await setField("area_id", areaId);
await waitFor(`(() => [...document.querySelector('[name="village_id"]')?.options || []].some((option) => option.textContent.trim() === ${JSON.stringify(village)}))()`, "Village was not filtered into the customer form");
const villageId = await evaluate(`(() => [...document.querySelector('[name="village_id"]').options].find((option) => option.textContent.trim() === ${JSON.stringify(village)})?.value)()`);
await setField("village_id", villageId);
await clickText("Save customer");
await waitFor(`!([...document.querySelectorAll('button')].some((node) => node.textContent.trim() === 'Save customer')) || ${JSON.stringify(dialogMessage)} !== ''`, "Customer form did not finish saving");
if (dialogMessage) throw new Error(`Customer form error: ${dialogMessage}`);
await waitFor(`(() => [...document.querySelectorAll('tbody tr')].some((row) => row.textContent.includes(${JSON.stringify(customer)}) && row.textContent.includes(${JSON.stringify(area)}) && row.textContent.includes(${JSON.stringify(village)})))()`, "Customer row did not show the saved area and village");

console.log(JSON.stringify({ area, village, customer, areaId, villageId, verified: true }));
socket.close();
