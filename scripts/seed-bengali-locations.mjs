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

const locations = [
  { area: "ঢাকা মহানগর", villages: ["মিরপুর", "উত্তরা", "মোহাম্মদপুর", "বাড্ডা", "যাত্রাবাড়ী"] },
  { area: "চট্টগ্রাম অঞ্চল", villages: ["পতেঙ্গা", "হালিশহর", "পাহাড়তলী", "চান্দগাঁও", "বাকলিয়া"] },
  { area: "রাজশাহী অঞ্চল", villages: ["পবা", "গোদাগাড়ী", "তানোর", "বাগমারা", "চারঘাট"] },
  { area: "খুলনা অঞ্চল", villages: ["রূপসা", "দিঘলিয়া", "ডুমুরিয়া", "বটিয়াঘাটা", "ফুলতলা"] },
  { area: "সিলেট অঞ্চল", villages: ["গোলাপগঞ্জ", "বিয়ানীবাজার", "কানাইঘাট", "জকিগঞ্জ", "বিশ্বনাথ"] },
];
const people = ["মোঃ আব্দুর রহিম", "মোছাঃ ফাতেমা বেগম", "মোঃ করিম উদ্দিন", "সাবিনা ইয়াসমিন", "মোঃ জাহিদ হাসান"];

await command("Runtime.enable");
await command("Page.navigate", { url: "http://localhost:3100/login" });
await waitFor("document.querySelector('button')?.textContent.includes('Sign in')", "Login page did not load");
await evaluate(`(() => { document.querySelector('button').click(); return true; })()`);
await waitFor("location.pathname === '/'", "Login failed");

const result = await evaluate(`(async () => {
  const locations = ${JSON.stringify(locations)};
  const people = ${JSON.stringify(people)};
  async function post(body) {
    const response = await fetch('/api/pos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }
  let customerNumber = 0;
  const created = [];
  for (const location of locations) {
    const area = await post({ action: 'area.save', name: location.area, status: 'active' });
    const areaResult = { name: location.area, id: area.id, villages: [] };
    for (const villageName of location.villages) {
      const village = await post({ action: 'village.save', area_id: area.id, name: villageName, status: 'active' });
      const villageResult = { name: villageName, id: village.id, customers: [] };
      for (const person of people) {
        customerNumber++;
        const name = person + ' - ' + villageName;
        const phone = '01' + String(700000000 + customerNumber).padStart(9, '0');
        const customer = await post({ action: 'customer.save', name, phone, area_id: area.id, village_id: village.id, status: 'active' });
        villageResult.customers.push({ id: customer.id, name });
      }
      areaResult.villages.push(villageResult);
    }
    created.push(areaResult);
  }
  const [areas, villages, customers] = await Promise.all([
    fetch('/api/pos?type=areas').then((r) => r.json()),
    fetch('/api/pos?type=villages').then((r) => r.json()),
    fetch('/api/pos?type=customers').then((r) => r.json()),
  ]);
  const validVillageCounts = villages.every((village) => customers.filter((customer) => Number(customer.village_id) === Number(village.id)).length === 5);
  const validAreaCounts = areas.every((area) => villages.filter((village) => Number(village.area_id) === Number(area.id)).length === 5);
  return { areaCount: areas.length, villageCount: villages.length, customerCount: customers.length, validAreaCounts, validVillageCounts, created };
})()`);

if (result.areaCount !== 5 || result.villageCount !== 25 || result.customerCount !== 125 || !result.validAreaCounts || !result.validVillageCounts) {
  throw new Error(`Verification failed: ${JSON.stringify(result)}`);
}
console.log(JSON.stringify({ areaCount: result.areaCount, villageCount: result.villageCount, customerCount: result.customerCount, validAreaCounts: result.validAreaCounts, validVillageCounts: result.validVillageCounts }, null, 2));
socket.close();
