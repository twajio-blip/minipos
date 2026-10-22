const targets = await (await fetch("http://127.0.0.1:9223/json")).json();
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("Browser page not found");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});
function command(method, params = {}) {
  const commandId = ++id;
  socket.send(JSON.stringify({ id: commandId, method, params }));
  return new Promise((resolve, reject) => pending.set(commandId, { resolve, reject }));
}
async function evaluate(expression) {
  const response = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function waitFor(expression, message) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(message);
}

await command("Runtime.enable");
await command("Page.navigate", { url: "http://localhost:3100/login" });
await waitFor("document.querySelector('button')?.textContent.includes('Sign in')", "Login page did not load");
await evaluate("(() => { document.querySelector('button').click(); return true; })()");
await waitFor("location.pathname === '/'", "Login failed");

const result = await evaluate(`(async () => {
  async function post(body) {
    const response = await fetch('/api/pos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }
  const customers = await fetch('/api/pos?type=customers').then((response) => response.json());
  const assignments = [];
  for (let index = 0; index < customers.length; index++) {
    const customer = customers[index];
    const type = Math.random() < 0.5 ? 'due' : 'advance';
    const amount = (Math.floor(Math.random() * 196) + 5) * 100;
    await post({ action: 'customer.opening.set', customer_id: customer.id, amount, type, date: '2026-10-21' });
    assignments.push({ customer_id: customer.id, type, amount });
  }
  const verified = await fetch('/api/pos?type=customers').then((response) => response.json());
  return {
    total: verified.length,
    due: verified.filter((customer) => Number(customer.balance) > 0).length,
    advance: verified.filter((customer) => Number(customer.balance) < 0).length,
    zero: verified.filter((customer) => Number(customer.balance) === 0).length,
    minimum: Math.min(...assignments.map((item) => item.amount)),
    maximum: Math.max(...assignments.map((item) => item.amount)),
  };
})()`);

if (result.total !== 125 || result.zero !== 0 || result.due === 0 || result.advance === 0) {
  throw new Error(`Opening balance verification failed: ${JSON.stringify(result)}`);
}
console.log(JSON.stringify(result, null, 2));
socket.close();
