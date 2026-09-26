// Standalone Node test harness for Checkpoint 4 (Settings / Warehouse & Location Management).
// Loads the actual <script> block out of StockSense.html into a vm context with stubbed
// document/localStorage/prompt/confirm, then drives DB + the new settings functions directly.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2] || 'StockSense.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

let pass = 0, fail = 0;
function ok(desc, cond) {
  if (cond) { pass++; console.log('  PASS:', desc); }
  else { fail++; console.log('  FAIL:', desc); }
}

function makeStore(initial) {
  return { data: initial ? JSON.stringify(initial) : null,
    getItem() { return this.data; },
    setItem(k, v) { this.data = v; } };
}

function stubEl() {
  return new Proxy({ value: '', textContent: '', innerHTML: '',
    classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
    appendChild(){}, remove(){}, addEventListener(){} },
    { get(t,p){ return p in t ? t[p] : (typeof p==='string' ? '' : undefined); }, set(t,p,v){ t[p]=v; return true; } });
}

function loadApp(initialDb, promptQueue, confirmAnswer) {
  const localStorage = makeStore(initialDb);
  const elCache = {};
  const document = {
    getElementById: (id) => (elCache[id] || (elCache[id] = stubEl())),
    createElement: () => stubEl(),
    querySelectorAll: () => [],
  };
  const promptCalls = [];
  const sandbox = {
    document, localStorage, console,
    window: {},
    location: { reload(){} },
    prompt: (msg, def) => { promptCalls.push(msg); const q = promptQueue || []; return q.length ? q.shift() : def; },
    confirm: () => (confirmAnswer === undefined ? true : confirmAnswer),
    alert: () => {},
    Math, Date, JSON, Number, String, isNaN, Object, Array, Boolean, parseInt, parseFloat,
    RegExp, Proxy, Reflect, Error, TypeError, setTimeout, clearTimeout,
  };
  // Any bare identifier the script references that isn't already a real global (e.g. the
  // implicit "main", "rProd", "aReason", ... element-id globals browsers create) falls back to
  // a stub DOM element instead of throwing a ReferenceError, mirroring the project's own
  // "stubbed document/localStorage, not a browser" test harness approach.
  const proxied = new Proxy(sandbox, {
    has() { return true; },
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol') return undefined;
      return (elCache[prop] || (elCache[prop] = stubEl()));
    },
  });
  vm.createContext(proxied);
  vm.runInContext(script, proxied);
  // Top-level `let`/`const` in the loaded script live in the vm context's lexical scope, not as
  // properties of the sandbox object — re-bind the names this harness needs onto the sandbox.
  const expose = ['DB','allLocs','findWarehouse','locationInUse','locOptions','prodOptions',
    'setDefaultWarehouse','addWarehouse','renameWarehouse','removeWarehouse',
    'addLocation','renameLocation','removeLocation',
    'docAction','docList','renderDocPage','ref','getStock','setStock','stockKey','totalStock',
    'save','renderSettings'];
  vm.runInContext('this.__exposed = {' + expose.map(n=>`${n}: (typeof ${n}!=='undefined'?${n}:undefined)`).join(',') + '};', proxied);
  Object.assign(sandbox, sandbox.__exposed);
  sandbox.__promptCalls = promptCalls;
  sandbox.document = document;
  return sandbox;
}

console.log('=== Checkpoint 4: Settings / Warehouse & Location Management ===\n');

// ---- 1. Fresh install: brand-new DB gets warehouses migrated from DEFAULT_LOC ----
{
  const app = loadApp(null);
  ok('fresh DB gets DB.warehouses seeded from DEFAULT_LOC', app.DB.warehouses.length === 2);
  ok('fresh DB warehouse names match legacy LOC', app.DB.warehouses.map(w=>w.name).join(',') === 'Main Warehouse,Production Warehouse');
  ok('fresh DB locations match legacy LOC', JSON.stringify(app.allLocs().sort()) === JSON.stringify(['Finished Goods','Production Rack','Rack A','Rack B'].sort()));
  ok('fresh DB gets a default warehouse', app.DB.defaultWarehouse === 'Main Warehouse');
}

// ---- 2. Backward-compat migration: pre-checkpoint-4 blob (no warehouses key at all) ----
{
  const preCp4 = {
    users:[{name:'A',email:'a@a.com',pass:'secret1',role:'Inventory Manager'}],
    session:'a@a.com', products:[{name:'Steel Rod',sku:'STR-001',cat:'Raw',unit:'KG',reorder:20}],
    stock:{'STR-001@@Rack A':70,'STR-001@@Rack B':30}, ledger:[{ref:'REC-001',product:'Steel Rod',sku:'STR-001',qty:100,type:'Receipt',loc:'Rack A',user:'a@a.com',date:'x',status:'Done'}],
    receipts:[{id:'REC-001',sku:'STR-001',loc:'Rack A',qty:100,status:'Done'}],
    deliveries:[], transfers:[{id:'TRF-001',sku:'STR-001',qty:10,from:'Rack A',to:'Rack B',status:'Done'}],
    adjustments:[], seq:5
  };
  const app = loadApp(preCp4);
  ok('pre-cp4 blob migrates warehouses from DEFAULT_LOC', app.DB.warehouses.length === 2);
  ok('pre-cp4 existing stock keys still resolve (Rack A)', app.getStock('STR-001','Rack A') === 70);
  ok('pre-cp4 existing stock keys still resolve (Rack B)', app.getStock('STR-001','Rack B') === 30);
  ok('pre-cp4 existing users/products preserved', app.DB.users.length===1 && app.DB.products.length===1);
  ok('pre-cp4 existing receipts/transfers preserved', app.DB.receipts.length===1 && app.DB.transfers.length===1);
  ok('pre-cp4 default warehouse assigned', app.DB.defaultWarehouse === 'Main Warehouse');
  ok('pre-cp4 allLocs() unchanged set', JSON.stringify(app.allLocs().sort()) === JSON.stringify(['Finished Goods','Production Rack','Rack A','Rack B'].sort()));
}

// ---- 3. Already-migrated blob (has DB.warehouses) is left alone ----
{
  const already = {
    users:[], session:null, products:[], stock:{}, ledger:[], receipts:[], deliveries:[], transfers:[], adjustments:[], seq:1,
    warehouses:[{name:'Custom WH',locations:['Bay 1']}], defaultWarehouse:'Custom WH'
  };
  const app = loadApp(already);
  ok('already-migrated DB.warehouses is not overwritten', app.DB.warehouses.length===1 && app.DB.warehouses[0].name==='Custom WH');
  ok('already-migrated defaultWarehouse preserved', app.DB.defaultWarehouse==='Custom WH');
}

// ---- 4. Default warehouse setting ----
{
  const app = loadApp(null);
  app.setDefaultWarehouse('Production Warehouse');
  ok('setDefaultWarehouse updates DB.defaultWarehouse', app.DB.defaultWarehouse==='Production Warehouse');
  app.setDefaultWarehouse('Nonexistent Warehouse');
  ok('setDefaultWarehouse ignores unknown warehouse name', app.DB.defaultWarehouse==='Production Warehouse');
}

// ---- 5. Add warehouse ----
{
  const app = loadApp(null);
  app.document.getElementById('newWhName').value = 'East Coast DC';
  app.addWarehouse();
  ok('addWarehouse creates a new warehouse', !!app.findWarehouse('East Coast DC'));
  ok('new warehouse starts with zero locations', app.findWarehouse('East Coast DC').locations.length===0);
  // duplicate name (case-insensitive) rejected
  app.document.getElementById('newWhName').value = 'east coast dc';
  app.addWarehouse();
  ok('addWarehouse rejects duplicate name (case-insensitive)', app.DB.warehouses.filter(w=>w.name.toLowerCase()==='east coast dc').length===1);
  // empty name rejected
  const before = app.DB.warehouses.length;
  app.document.getElementById('newWhName').value = '   ';
  app.addWarehouse();
  ok('addWarehouse rejects empty/whitespace name', app.DB.warehouses.length===before);
}

// ---- 6. Add location ----
{
  const app = loadApp(null);
  const wi = app.DB.warehouses.findIndex(w=>w.name==='Main Warehouse');
  app.document.getElementById('newLocName_'+wi).value = 'Rack C';
  app.addLocation('Main Warehouse', wi);
  ok('addLocation adds a new location', app.allLocs().includes('Rack C'));
  // duplicate across warehouses rejected
  const wi2 = app.DB.warehouses.findIndex(w=>w.name==='Production Warehouse');
  app.document.getElementById('newLocName_'+wi2).value = 'Rack C';
  app.addLocation('Production Warehouse', wi2);
  ok('addLocation rejects a name already used in ANOTHER warehouse', app.allLocs().filter(l=>l==='Rack C').length===1);
}

// ---- 7. Rename location (safe) — cascades to stock, documents, ledger ----
{
  const preset = {
    users:[], session:'u@u.com', products:[{name:'Widget',sku:'WID-1',cat:'G',unit:'pcs',reorder:5}],
    stock:{'WID-1@@Rack A':40}, ledger:[{ref:'REC-100',product:'Widget',sku:'WID-1',qty:40,type:'Receipt',loc:'Rack A',user:'u@u.com',date:'x',status:'Done'},
      {ref:'TRF-100',product:'Widget',sku:'WID-1',qty:5,type:'Transfer',loc:'Rack A → Rack B',user:'u@u.com',date:'x',status:'Done'}],
    receipts:[{id:'REC-100',sku:'WID-1',loc:'Rack A',qty:40,status:'Done'}],
    deliveries:[], transfers:[{id:'TRF-100',sku:'WID-1',qty:5,from:'Rack A',to:'Rack B',status:'Done'}],
    adjustments:[], seq:10,
    warehouses:[{name:'Main Warehouse',locations:['Rack A','Rack B']}], defaultWarehouse:'Main Warehouse'
  };
  const app = loadApp(preset, ['Rack A-Renamed']);
  app.renameLocation('Main Warehouse','Rack A');
  ok('renameLocation updates warehouse.locations', app.findWarehouse('Main Warehouse').locations.includes('Rack A-Renamed'));
  ok('renameLocation cascades stock key', app.getStock('WID-1','Rack A-Renamed')===40 && app.getStock('WID-1','Rack A')===0);
  ok('renameLocation cascades receipt.loc', app.DB.receipts[0].loc==='Rack A-Renamed');
  ok('renameLocation cascades transfer.from', app.DB.transfers[0].from==='Rack A-Renamed');
  ok('renameLocation cascades plain ledger.loc', app.DB.ledger[0].loc==='Rack A-Renamed');
  ok('renameLocation cascades "A -> B" ledger.loc', app.DB.ledger[1].loc==='Rack A-Renamed → Rack B');
}

// ---- 8. Rename location blocked on name collision ----
{
  const app = loadApp(null, ['Rack B']); // try renaming Rack A to the already-existing Rack B
  app.renameLocation('Main Warehouse','Rack A');
  ok('renameLocation blocked when new name collides with an existing location', app.allLocs().includes('Rack A') && app.allLocs().filter(l=>l==='Rack B').length===1);
}

// ---- 9. Rename warehouse (safe) + keeps default pointer valid ----
{
  const app = loadApp(null, ['Main WH Renamed']);
  app.setDefaultWarehouse('Main Warehouse');
  app.renameWarehouse('Main Warehouse');
  ok('renameWarehouse updates name', !!app.findWarehouse('Main WH Renamed'));
  ok('renameWarehouse updates DB.defaultWarehouse pointer if it was the default', app.DB.defaultWarehouse==='Main WH Renamed');
}

// ---- 10. Rename warehouse blocked on name collision ----
{
  const app = loadApp(null, ['Production Warehouse']);
  app.renameWarehouse('Main Warehouse');
  ok('renameWarehouse blocked on duplicate name', !!app.findWarehouse('Main Warehouse') && !!app.findWarehouse('Production Warehouse'));
}

// ---- 11. Remove unused location: allowed ----
{
  const app = loadApp(null);
  // no stock, no docs reference "Rack B" in this fresh DB
  ok('locationInUse is false for a never-referenced location', app.locationInUse('Rack B')===false);
  app.removeLocation('Main Warehouse','Rack B');
  ok('removeLocation removes an unused location', !app.allLocs().includes('Rack B'));
}

// ---- 12. Remove in-use location: blocked (nonzero stock) ----
{
  const preset = {
    users:[], session:null, products:[{name:'Widget',sku:'WID-1',cat:'G',unit:'pcs',reorder:5}],
    stock:{'WID-1@@Rack A':10}, ledger:[], receipts:[], deliveries:[], transfers:[], adjustments:[], seq:1,
    warehouses:[{name:'Main Warehouse',locations:['Rack A','Rack B']}], defaultWarehouse:'Main Warehouse'
  };
  const app = loadApp(preset);
  ok('locationInUse is true when stock is non-zero there', app.locationInUse('Rack A')===true);
  app.removeLocation('Main Warehouse','Rack A');
  ok('removeLocation blocked by non-zero stock', app.allLocs().includes('Rack A'));
}

// ---- 13. Remove in-use location: blocked (referenced by a document, even zero stock) ----
{
  const preset = {
    users:[], session:null, products:[{name:'Widget',sku:'WID-1',cat:'G',unit:'pcs',reorder:5}],
    stock:{'WID-1@@Rack A':0}, ledger:[], receipts:[{id:'REC-1',sku:'WID-1',loc:'Rack A',qty:10,status:'Draft'}],
    deliveries:[], transfers:[], adjustments:[], seq:1,
    warehouses:[{name:'Main Warehouse',locations:['Rack A','Rack B']}], defaultWarehouse:'Main Warehouse'
  };
  const app = loadApp(preset);
  ok('locationInUse is true when a Draft document references it (zero stock)', app.locationInUse('Rack A')===true);
  app.removeLocation('Main Warehouse','Rack A');
  ok('removeLocation blocked by document reference', app.allLocs().includes('Rack A'));
}

// ---- 14. Remove warehouse: blocked while it still has locations ----
{
  const app = loadApp(null);
  app.removeWarehouse('Main Warehouse');
  ok('removeWarehouse blocked while warehouse still has locations', !!app.findWarehouse('Main Warehouse'));
}

// ---- 15. Remove warehouse: allowed once empty, reassigns default if needed ----
{
  const app = loadApp(null);
  app.setDefaultWarehouse('Main Warehouse');
  app.removeLocation('Main Warehouse','Rack A');
  app.removeLocation('Main Warehouse','Rack B');
  app.removeWarehouse('Main Warehouse');
  ok('removeWarehouse succeeds once empty', !app.findWarehouse('Main Warehouse'));
  ok('removeWarehouse reassigns default warehouse away from the removed one', app.DB.defaultWarehouse==='Production Warehouse');
}

// ---- 16. Remove warehouse: blocked as the last remaining warehouse ----
{
  const app = loadApp(null);
  app.removeLocation('Main Warehouse','Rack A');
  app.removeLocation('Main Warehouse','Rack B');
  app.removeWarehouse('Main Warehouse');
  app.removeLocation('Production Warehouse','Production Rack');
  app.removeLocation('Production Warehouse','Finished Goods');
  app.removeWarehouse('Production Warehouse'); // would be the last one
  ok('removeWarehouse refuses to remove the last warehouse', app.DB.warehouses.length===1);
}

// ---- 17. locOptions()/allLocs() reflect DB, not any hard-coded constant ----
{
  const app = loadApp(null);
  app.document.getElementById('newWhName').value='New WH';
  app.addWarehouse();
  const wi=app.DB.warehouses.findIndex(w=>w.name==='New WH');
  app.document.getElementById('newLocName_'+wi).value='Custom Loc';
  app.addLocation('New WH', wi);
  ok('locOptions() includes a freshly-added location', app.locOptions().includes('Custom Loc'));
  ok('allLocs() includes a freshly-added location', app.allLocs().includes('Custom Loc'));
}

// ---- 18. locOptions() pre-selects the default warehouse's first location ----
{
  const app = loadApp(null);
  app.setDefaultWarehouse('Production Warehouse');
  const opts = app.locOptions();
  ok('locOptions() marks default warehouse\'s first location as selected', /<option selected>Production Rack<\/option>/.test(opts));
}

// ===================== REGRESSION: existing document lifecycles unaffected =====================
console.log('\n=== Regression: Receipt/Delivery/Transfer/Adjustment lifecycles ===\n');
{
  const app = loadApp(null);
  app.DB.session = 'tester@x.com';
  app.DB.products.push({name:'Steel Rod',sku:'STR-001',cat:'Raw',unit:'KG',reorder:20});

  // Receipt full lifecycle
  app.DB.receipts.push({id:app.ref('REC'),sku:'STR-001',loc:'Rack A',qty:100,status:'Draft'});
  let rec = app.DB.receipts[0];
  app.docAction('receipt','submit',rec.id);
  app.docAction('receipt','ready',rec.id);
  app.docAction('receipt','validate',rec.id);
  ok('Receipt full lifecycle -> Done, stock increased', rec.status==='Done' && app.getStock('STR-001','Rack A')===100);
  ok('Receipt validate wrote exactly one ledger entry', app.DB.ledger.filter(l=>l.ref===rec.id).length===1);
  app.docAction('receipt','validate',rec.id); // duplicate validate
  ok('Duplicate receipt validate is a no-op', app.getStock('STR-001','Rack A')===100 && app.DB.ledger.filter(l=>l.ref===rec.id).length===1);

  // Delivery full lifecycle + insufficient stock check
  app.DB.deliveries.push({id:app.ref('DEL'),sku:'STR-001',loc:'Rack A',qty:9999,status:'Draft'});
  let del = app.DB.deliveries[0];
  app.docAction('delivery','submit',del.id); app.docAction('delivery','ready',del.id); app.docAction('delivery','validate',del.id);
  ok('Oversized delivery blocked, stock untouched, stays Ready', del.status==='Ready' && app.getStock('STR-001','Rack A')===100);
  del.qty=5;
  app.docAction('delivery','validate',del.id);
  ok('Delivery validated after fixing quantity', del.status==='Done' && app.getStock('STR-001','Rack A')===95);

  // Transfer full lifecycle
  app.DB.transfers.push({id:app.ref('TRF'),sku:'STR-001',qty:10,from:'Rack A',to:'Rack B',status:'Draft'});
  let trf = app.DB.transfers[0];
  app.docAction('transfer','submit',trf.id); app.docAction('transfer','ready',trf.id); app.docAction('transfer','validate',trf.id);
  ok('Transfer moves stock source->dest, total unchanged', app.getStock('STR-001','Rack A')===85 && app.getStock('STR-001','Rack B')===10);
  ok('Transfer wrote exactly one ledger entry', app.DB.ledger.filter(l=>l.ref===trf.id).length===1);

  // Adjustment: discrepancy without reason blocked, then corrected
  app.DB.adjustments.push({id:app.ref('ADJ'),sku:'STR-001',loc:'Rack A',phys:80,reason:'',status:'Draft'});
  let adj = app.DB.adjustments[0];
  app.docAction('adjustment','submit',adj.id); app.docAction('adjustment','ready',adj.id);
  app.docAction('adjustment','validate',adj.id);
  ok('Adjustment missing reason blocked, stays Ready', adj.status==='Ready' && app.getStock('STR-001','Rack A')===85);
  adj.reason='Cycle count';
  app.docAction('adjustment','edit',adj.id); // no-op path check: edit while Ready is allowed for adjustments
  app.docAction('adjustment','validate',adj.id);
  ok('Adjustment validated after reason added', adj.status==='Done' && app.getStock('STR-001','Rack A')===80);

  // Zero-delta adjustment
  app.DB.adjustments.push({id:app.ref('ADJ'),sku:'STR-001',loc:'Rack B',phys:10,reason:'',status:'Draft'});
  let adj0 = app.DB.adjustments[1];
  app.docAction('adjustment','submit',adj0.id); app.docAction('adjustment','ready',adj0.id); app.docAction('adjustment','validate',adj0.id);
  ok('Zero-delta adjustment succeeds, ledger qty 0', adj0.status==='Done' && app.DB.ledger.find(l=>l.ref===adj0.id).qty===0);

  ok('No duplicate mutation across the whole run: exactly one ledger entry per validated doc',
     [rec.id, del.id, trf.id, adj.id, adj0.id].every(id => app.DB.ledger.filter(l=>l.ref===id).length===1));
}

console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
