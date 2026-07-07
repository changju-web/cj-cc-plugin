# wd-crud-page Routes

## 只生成列表页

```text
用户：根据接口生成小程序人员管理列表页
执行链路：wd-list-page
```

## 列表加新增

```text
用户：生成小程序设备管理列表和新增设备页面
执行链路：wd-list-page -> wd-form-page
```

## 完整业务模块

```text
用户：根据接口生成小程序访客管理完整 CRUD
执行链路：wd-list-page -> wd-form-page -> wd-detail-page
```

## 已有列表追加详情

```text
用户：给当前小程序人员列表加详情页
执行链路：wd-detail-page
```
