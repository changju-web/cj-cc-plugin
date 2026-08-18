// gen-spec.mjs — OpenAPI → agent 友好切片
// 零依赖。读 api-spec/input/ 下所有 json（或子目录里的 openapi.json），
// 每份生成 output/<服务名>/ 切片。全量重跑。
//
// 可选配置 api-spec/config.json（只放覆盖项）：
//   - noisyPrefixes: string[] — 追加噪音端点前缀（内置 /actuator 等已生效，无需重复写）
//   - contextPaths: Record<string, string> — 手动下载的 json（无 x-context-path 元数据）的
//     网关前缀映射，key 为服务名。优先级：input json 的 x-context-path > 本映射 > 无（标注未知）
//
// 用法：
//   node api-spec/scripts/gen-spec.mjs                 # 默认读 input/
//   OPENAPI_IN=自定义路径 node api-spec/scripts/gen-spec.mjs   # 覆盖输入目录
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ============ 路径 ============
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // api-spec/
const PROJECT_ROOT = path.resolve(ROOT, '..');
const IN_DIR = process.env.OPENAPI_IN ? path.resolve(process.env.OPENAPI_IN) : path.join(ROOT, 'input');
const OUT_DIR = process.env.OPENAPI_OUT ? path.resolve(process.env.OPENAPI_OUT) : path.join(ROOT, 'output');

// ============ 0. 可选配置 api-spec/config.json ============
const CONFIG_FILE = path.join(ROOT, 'config.json');
const config = fs.existsSync(CONFIG_FILE)
  ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  : {};
const NOISY_PREFIXES = [
  '/actuator', '/v3/api-docs', '/swagger-resources', '/swagger-ui', '/doc.html',
  ...(Array.isArray(config.noisyPrefixes) ? config.noisyPrefixes.map(String) : []),
];
const CONTEXT_PATHS =
  config.contextPaths && typeof config.contextPaths === 'object' && !Array.isArray(config.contextPaths)
    ? config.contextPaths
    : {};
const METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

// index.md 纪律文案里提示的命令，按 lockfile 探测包管理器（只影响文案，不影响行为）
const detectRunCmd = () => {
  try {
    const files = fs.readdirSync(PROJECT_ROOT);
    if (files.includes('pnpm-lock.yaml')) return 'pnpm';
    if (files.includes('yarn.lock')) return 'yarn';
    if (files.includes('bun.lockb') || files.includes('bun.lock')) return 'bun run';
  } catch { /* 只影响提示文案 */ }
  return 'npm run';
};
const RUN = detectRunCmd();

// ============ 1. 扫描 input：收集 { serviceName, filePath } ============
// 服务名来源：
//   - input/<服务名>/openapi.json（或任意 .json）→ 用目录名
//   - input/<文件名>.json                          → 用文件名（去扩展名，去 _OpenAPI 等后缀）
const collectInputs = () => {
  if (!fs.existsSync(IN_DIR)) {
    console.error(`[FATAL] 输入目录不存在: ${IN_DIR}`);
    console.error('  请创建该目录，并把后端导出的 OpenAPI json 放进去。');
    process.exit(1);
  }
  const entries = fs.readdirSync(IN_DIR, { withFileTypes: true });
  const inputs = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.json')) {
      const base = e.name.replace(/\.json$/i, '').replace(/[_-]?(openapi|api-docs|swagger)$/i, '');
      inputs.push({ serviceName: base || e.name.replace(/\.json$/i, ''), filePath: path.join(IN_DIR, e.name) });
    } else if (e.isDirectory()) {
      // 子目录：取里面所有 json，用目录名做服务名（多 json 时不拼后缀，目录名即服务名）
      const sub = fs.readdirSync(path.join(IN_DIR, e.name)).filter(f => f.endsWith('.json'));
      for (const f of sub) {
        inputs.push({ serviceName: e.name, filePath: path.join(IN_DIR, e.name, f) });
      }
    }
  }
  if (!inputs.length) {
    console.error(`[FATAL] 输入目录里没有 json: ${IN_DIR}`);
    console.error('  把后端导出的 OpenAPI json 放进该目录后重跑。');
    process.exit(1);
  }
  return inputs;
};

// ============ 2. 防御断言：复杂结构告警（未来后端引入 allOf/oneOf/anyOf 即报错） ============
const assertNoComplex = (spec, serviceName) => {
  let allOf = 0, oneOf = 0, anyOf = 0;
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (o.allOf) allOf++;
    if (o.oneOf) oneOf++;
    if (o.anyOf) anyOf++;
    for (const v of Object.values(o)) walk(v);
  };
  walk(spec);
  if (allOf || oneOf || anyOf) {
    console.error(`[FATAL][${serviceName}] 检测到 allOf=${allOf} oneOf=${oneOf} anyOf=${anyOf}。`);
    console.error('  本脚本不处理继承/组合结构。请改用 @redocly/openapi-core bundle，或在脚本中补齐合并逻辑。');
    process.exit(1);
  }
};

// ============ 3. $ref 解析（内部引用，递归内联，visited 防循环） ============
const resolveRef = (obj, spec, visited = new Set()) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj.$ref) {
    if (obj.$ref.startsWith('#/components/schemas/')) {
      const name = obj.$ref.slice('#/components/schemas/'.length);
      if (visited.has(name)) return { $circular: name }; // 防御：当前数据 0 allOf，理论不触发
      const target = spec.components?.schemas?.[name];
      if (!target) return { $unresolved: obj.$ref };
      return resolveRef(target, spec, new Set([...visited, name]));
    }
    return { $unsupportedRef: obj.$ref };
  }
  if (Array.isArray(obj)) return obj.map(v => resolveRef(v, spec, visited));
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = resolveRef(v, spec, visited);
  return out;
};

// ============ 4. 响应清理（只留2xx + 折叠 IPage 噪音） ============
const IPAGE_SIGNATURE = new Set(['countId', 'maxLimit', 'optimizeCountSql', 'optimizeJoinOfCountSql', 'searchCount']);
const IPAGE_NOISE = new Set([...IPAGE_SIGNATURE, 'pages', 'orders']);

const foldIPage = (schema) => {
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.properties) {
    const keys = Object.keys(schema.properties);
    if (keys.some(k => IPAGE_SIGNATURE.has(k))) {
      const cleaned = {};
      for (const [k, v] of Object.entries(schema.properties)) {
        if (!IPAGE_NOISE.has(k)) cleaned[k] = foldIPage(v);
      }
      schema.properties = cleaned;
      schema['$simplified'] = 'MyBatis-Plus IPage 框架字段已折叠（countId/maxLimit/optimizeCountSql/optimizeJoinOfCountSql/searchCount/pages/orders）';
    } else {
      for (const [k, v] of Object.entries(schema.properties)) schema.properties[k] = foldIPage(v);
    }
  }
  if (schema.items) schema.items = foldIPage(schema.items);
  return schema;
};

const simplifyOperation = (op) => {
  if (!op.responses) return op;
  const success = {};
  for (const code of Object.keys(op.responses)) {
    if (/^2\d\d$/.test(code)) {
      const resp = op.responses[code];
      if (resp.content) {
        for (const mt of Object.keys(resp.content)) {
          if (resp.content[mt].schema) resp.content[mt].schema = foldIPage(resp.content[mt].schema);
        }
      }
      success[code] = resp;
    }
  }
  op.responses = success;
  return op;
};

// ============ 5. 单份 json 处理：产出 { paths, schemas, pathMeta } ============
const sanitize = (s) => s.replace(/^\//, '').replace(/\//g, '-').replace(/[{}]/g, '');

const processOne = (spec, serviceName) => {
  assertNoComplex(spec, serviceName);
  // 网关前缀（contextPath）优先级：input json 顶层 x-context-path（fetch-spec 写入）>
  // config.json 的 contextPaths 映射（手动下载兜底）> 无。拼接后切片 path 即前端真实调用的全路径。
  const specCp = typeof spec['x-context-path'] === 'string' ? spec['x-context-path'].trim() : '';
  const configCp = typeof CONTEXT_PATHS[serviceName] === 'string' ? CONTEXT_PATHS[serviceName].trim() : '';
  const contextPath = (specCp || configCp).replace(/\/+$/, '');
  const contextSource = specCp ? 'spec 元数据' : configCp ? 'config 映射' : '';
  const outPaths = [];
  const outSchemas = [];
  const pathMeta = [];
  let keptPaths = 0, droppedPaths = 0;

  // 5a. path 切片
  for (const [rawPath, item] of Object.entries(spec.paths || {})) {
    if (NOISY_PREFIXES.some(pre => rawPath.includes(pre))) { droppedPaths++; continue; }
    keptPaths++;
    const ops = {};
    const tags = new Set();
    const schemasUsed = new Set();
    for (const m of METHODS) {
      if (!item[m]) continue;
      ops[m] = simplifyOperation(resolveRef(item[m], spec));
      (item[m].tags || []).forEach(t => tags.add(t));
      const collectRefs = (o) => {
        if (!o || typeof o !== 'object') return;
        if (o.$ref && typeof o.$ref === 'string' && o.$ref.startsWith('#/components/schemas/')) {
          schemasUsed.add(o.$ref.slice('#/components/schemas/'.length));
        }
        for (const v of Object.values(o)) collectRefs(v);
      };
      collectRefs(item[m]);
    }
    // 文件名保持服务内路径：产物目录已按服务分组，逐文件重复前缀是冗余
    const fileBase = sanitize(rawPath);
    const fullPath = contextPath + rawPath;
    outPaths.push({
      file: `paths/${fileBase}.json`,
      content: JSON.stringify({
        path: fullPath,
        operations: ops,
        ...(item.parameters ? { commonParameters: resolveRef(item.parameters, spec) } : {}),
      }, null, 2),
    });
    pathMeta.push({
      file: `paths/${fileBase}.json`,
      path: fullPath,
      methods: Object.keys(ops),
      tags: [...tags],
      schemasUsed: [...schemasUsed].sort(),
    });
  }

  // 5b. schema 切片
  for (const [name, schema] of Object.entries(spec.components?.schemas || {})) {
    outSchemas.push({
      file: `schemas/${name}.json`,
      content: JSON.stringify(resolveRef(schema, spec), null, 2),
    });
  }

  return { keptPaths, droppedPaths, outPaths, outSchemas, pathMeta, contextPath, contextSource };
};

// ============ 6. 写一个服务的产物目录 ============
const writeServiceOutput = (serviceDir, processed) => {
  fs.mkdirSync(path.join(serviceDir, 'paths'), { recursive: true });
  fs.mkdirSync(path.join(serviceDir, 'schemas'), { recursive: true });
  for (const p of processed.outPaths) {
    fs.writeFileSync(path.join(serviceDir, p.file), p.content);
  }
  for (const s of processed.outSchemas) {
    fs.writeFileSync(path.join(serviceDir, s.file), s.content);
  }
};

// ============ 7. 生成单服务的 index.md 段 ============
// Schema 一览的分组从数据推导（tag 派生），不依赖业务知识：
//   每个 schema 归入「使用它的接口」的 tag——统计每个 tag 下使用该 schema 的接口数，
//   取次数最多的 tag；并列时按 tag 名稳定排序。没有任何接口使用（直接或经包装 schema 传递）的归「未在接口中引用」。
//   注意"使用"是传递的：operation 直接引用的常是 RPageX/RObject 包装壳，业务 DTO 藏在壳内部，
//   所以把直接引用的 tag 计数沿 schema 间 $ref 依赖边向下传播，否则所有响应 DTO 都会掉进未引用组。
const UNUSED_GROUP = '未在接口中引用';

const buildServiceIndex = (spec, serviceName, processed) => {
  const { keptPaths, droppedPaths, pathMeta, contextPath, contextSource } = processed;
  const schemaCount = processed.outSchemas.length;

  const tagGroups = {};
  for (const m of pathMeta) {
    for (const t of (m.tags.length ? m.tags : ['(无tag)'])) {
      (tagGroups[t] = tagGroups[t] || []).push(m);
    }
  }

  // schemaName -> 它的定义里 $ref 到的其它 schema（依赖边）
  const schemaDeps = {};
  for (const [name, schema] of Object.entries(spec.components?.schemas || {})) {
    const deps = new Set();
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach(walk);
      if (typeof o.$ref === 'string' && o.$ref.startsWith('#/components/schemas/')) {
        deps.add(o.$ref.slice('#/components/schemas/'.length));
      }
      for (const v of Object.values(o)) walk(v);
    };
    walk(schema);
    schemaDeps[name] = deps;
  }

  // schemaName -> { tag: 使用它的接口数 }。直接引用先计数，再沿依赖边传播（同一来源的计数只加一次，防菱形/环重复）
  const tagRefCount = {};
  const direct = {};
  for (const m of pathMeta) {
    for (const t of (m.tags.length ? m.tags : ['(无tag)'])) {
      for (const s of m.schemasUsed) {
        const per = (direct[s] = direct[s] || {});
        per[t] = (per[t] || 0) + 1;
      }
    }
  }
  for (const [name, counts] of Object.entries(direct)) {
    tagRefCount[name] = { ...counts };
    const seen = new Set([name]);
    const stack = [...(schemaDeps[name] || [])];
    while (stack.length) {
      const d = stack.pop();
      if (seen.has(d)) continue;
      seen.add(d);
      const per = (tagRefCount[d] = tagRefCount[d] || {});
      for (const [t, c] of Object.entries(counts)) per[t] = (per[t] || 0) + c;
      stack.push(...(schemaDeps[d] || []));
    }
  }
  const schemaGroupOf = (n) => {
    const counts = tagRefCount[n];
    if (!counts) return UNUSED_GROUP;
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  };
  const schemaNames = processed.outSchemas.map(s => s.file.replace(/^schemas\//, '').replace(/\.json$/, ''));
  const schemaGroups = {};
  for (const n of schemaNames.sort()) {
    const g = schemaGroupOf(n);
    (schemaGroups[g] = schemaGroups[g] || []).push(n);
  }

  const md = [];
  md.push(`# ${serviceName} — API Spec Index\n`);
  md.push(`- title: \`${spec.info?.title || serviceName}\``);
  md.push(`- version: \`${spec.info?.version || '?'}\``);
  md.push(`- openapi: \`${spec.openapi || '?'}\``);
  md.push(
    contextSource
      ? `- contextPath: \`${contextPath || '(根)'}\`（来源：${contextSource}，下表 path 已含该前缀，即前端真实调用路径）`
      : `- contextPath: **未知**（input 无 x-context-path 且 config.json 未映射 contextPaths——下表 path 可能缺网关前缀，写接口调用代码前先核对）`
  );
  md.push(`- 业务 paths: ${keptPaths}（已过滤噪音 ${droppedPaths} 个运维端点）`);
  md.push(`- schemas: ${schemaCount}`);
  md.push(`- 使用纪律: 按需 Read 对应 \`paths/*.json\` / \`schemas/*.json\`，不要整份灌入上下文。\n`);

  md.push(`## 按业务 tag 分组的接口\n`);
  for (const [tag, metas] of Object.entries(tagGroups).sort((a, b) => b[1].length - a[1].length)) {
    md.push(`### ${tag} (${metas.length})\n`);
    md.push(`| method | path | file | 用到的 schema |`);
    md.push(`| --- | --- | --- | --- |`);
    for (const m of metas.sort((a, b) => a.path.localeCompare(b.path))) {
      md.push(`| ${m.methods.join('/')} | \`${m.path}\` | \`${m.file}\` | ${m.schemasUsed.map(s => `\`${s}\``).join(', ') || '—'} |`);
    }
    md.push('');
  }

  md.push(`## Schema 一览（按引用接口的 tag 派生分组）\n`);
  const groups = Object.entries(schemaGroups).sort((a, b) => {
    if (a[0] === UNUSED_GROUP) return 1; // 「未在接口中引用」固定垫底
    if (b[0] === UNUSED_GROUP) return -1;
    return b[1].length - a[1].length || a[0].localeCompare(b[0]);
  });
  for (const [g, names] of groups) {
    md.push(`### ${g} (${names.length})\n`);
    for (const n of names) md.push(`- \`${n}\` → \`schemas/${n}.json\``);
    md.push('');
  }
  return md.join('\n');
};

// ============ 8. 生成顶层 index.md（聚合所有服务） ============
const buildRootIndex = (services) => {
  const md = [];
  md.push(`# API Spec 总索引\n`);
  md.push(`本目录由 \`api-spec/scripts/gen-spec.mjs\` 从 \`api-spec/input/\` 下所有 OpenAPI json 生成。\n`);
  md.push(`- 服务数: ${services.length}`);
  md.push(`- 输入目录: \`api-spec/input/\`（往里面丢新的 json，重跑脚本即可，不用改代码）`);
  md.push(`- 产物目录: \`api-spec/output/\`（gitignore，运行时索引）\n`);
  md.push(`## 服务清单\n`);
  md.push(`| 服务 | contextPath | paths | schemas | index |`);
  md.push(`| --- | --- | --- | --- | --- |`);
  for (const s of services) {
    const cpLabel = s.contextSource
      ? `\`${s.contextPath || '(根)'}\``
      : '**未知**';
    md.push(`| ${s.serviceName} | ${cpLabel} | ${s.keptPaths} | ${s.schemaCount} | \`${s.serviceName}/index.md\` |`);
  }
  md.push('');
  md.push(`## Agent 使用纪律\n`);
  md.push(`1. 干业务开发前，先定位目标服务，Read \`api-spec/output/<服务>/index.md\`。`);
  md.push(`2. 按索引定位具体 path/schema 切片，只 Read 需要的那几个文件。`);
  md.push(`3. \`api-spec/output/\` 不存在时，先跑 \`${RUN} gen:spec\` 生成。`);
  md.push(`4. 后端更新 json 后，覆盖 \`api-spec/input/\` 对应文件（或跑 \`${RUN} spec:pull\`），重跑 \`${RUN} gen:spec\`。`);
  return md.join('\n');
};

// ============ 主流程 ============
const inputs = collectInputs();
console.log(`[scan] 输入目录 ${IN_DIR}`);
console.log(`[scan] 发现 ${inputs.length} 份 spec:`);
for (const i of inputs) console.log(`  - ${i.serviceName} ← ${path.relative(IN_DIR, i.filePath)}`);

// 全量重跑：清空 output 再重建（开发辅助工具，全量也就十几秒，不值得引入状态管理）
if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const services = [];
for (const { serviceName, filePath } of inputs) {
  const buf = fs.readFileSync(filePath);
  const spec = JSON.parse(buf.toString('utf8'));
  console.log(`\n[process] ${serviceName} | ${spec.info?.title} v${spec.info?.version} | ${(buf.length / 1024).toFixed(0)}KB`);
  const processed = processOne(spec, serviceName);
  const serviceDir = path.join(OUT_DIR, serviceName);
  writeServiceOutput(serviceDir, processed);
  fs.writeFileSync(path.join(serviceDir, 'index.md'), buildServiceIndex(spec, serviceName, processed));
  console.log(`  [paths] kept=${processed.keptPaths} dropped(noise)=${processed.droppedPaths}`);
  console.log(`  [schemas] written=${processed.outSchemas.length}`);
  services.push({
    serviceName,
    keptPaths: processed.keptPaths,
    schemaCount: processed.outSchemas.length,
    contextPath: processed.contextPath,
    contextSource: processed.contextSource,
  });
}

fs.writeFileSync(path.join(OUT_DIR, 'index.md'), buildRootIndex(services));
console.log(`\n[done] ${services.length} 份服务处理完成，输出: ${OUT_DIR}`);
console.log(`[done] 顶层索引: ${path.join(OUT_DIR, 'index.md')}`);
