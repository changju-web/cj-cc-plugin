## API Spec 识别纪律（所有端业务开发适用）

后端接口定义在 `api-spec/`：

```text
api-spec/
  input/      # 源 OpenAPI json（进 git，spec:pull 自动覆盖这里）
  scripts/    # fetch-spec.mjs 网关拉取 + gen-spec.mjs 预处理
  output/     # 切片产物（gitignore，运行时索引，按服务名分子目录）
```

业务开发（生成列表页/表单/详情/CRUD 等）识别接口定义**必须走切片，禁止整份灌入 json**：

1. 先 Read `api-spec/output/index.md` 定位目标服务。
2. 再 Read `api-spec/output/<服务名>/index.md`，按 tag 分组找接口。
3. 按需 Read 对应 `paths/*.json`（字段已内联展开）或 `schemas/*.json`，只取需要的几个文件。
4. **若 `api-spec/output/` 不存在**：先跑 `{{CMD_GEN}}`（干净环境首次必跑）。
5. **后端更新接口后**：跑 `{{CMD_PULL}}`（自动从开发环境网关拉最新 json 覆盖 `input/` 并重切片）；非该网关导出的 json 才手动覆盖后跑 `{{CMD_GEN}}`。

切片已做的简化（无需重复处理）：`$ref` 已内联、`/actuator` 等噪音端点已过滤、4xx/5xx 响应已剔除（只剩 2xx）、MyBatis-Plus `IPage` 框架字段已折叠（见 `$simplified` 标记）。
