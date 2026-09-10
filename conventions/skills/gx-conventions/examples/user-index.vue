<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { getModelFromJson } from "@gx-web/core";
import { useStateRef, useTablePage } from "@gx-web/tool";
import {
  GxPaginationTable,
  GxSearch,
  generateFormItems,
  generateTableColumns,
} from "@gx-web/ep-comp";
import TenantAllot from "../tenant/allot.vue";
import { UserSearchModel, UserTableModel } from "./user-model";
import UserAdd from "./user-add.vue";
import UserArea from "./components/area.vue";
import useTableSelection from "@/hooks/web/useTableSelection";
import { useToggle } from "@/hooks/web/useToggle";
import { useConfigStore, useUserStore } from "@/store/modules";
import User from "@/api/system/user";

defineOptions({
  name: "UserManage",
});

const ConfigStore = useConfigStore();
const userStore = useUserStore();

const [form, , resetForm] = useStateRef(() =>
  getModelFromJson(UserSearchModel, {
    username: "",
    gender: "",
    phone: "",
    userType: "",
    status: 1,
    isCreateByLoginUser: "1",
  }),
);

const searchItems = generateFormItems(UserSearchModel, [
  "username",
  "phone",
  {
    prop: "gender",
    type: "dict-select",
    props: { dictCode: "system-gender" },
    label: "性别",
  },
  {
    prop: "userType",
    type: "dict-select",
    props: { dictCode: "user-type" },
    label: "用户类型",
  },
  {
    prop: "status",
    type: "dict-select",
    props: { dictCode: "system-status" },
    label: "状态",
  },
  {
    prop: "isCreateByLoginUser",
    type: "select",
    props: {
      options: [
        { label: "是", value: "1" },
        { label: "否", value: "0" },
      ],
    },
    label: "由当前用户创建",
  },
]);

const columns = generateTableColumns(UserTableModel, [
  "username",
  "realName",
  "nickname",
  { prop: "gender", type: "dict", props: { dictCode: "system-gender" } },
  { prop: "phone", label: "联系电话", minWidth: 140 },
  { prop: "email", showOverflowTooltip: true },
  { prop: "userType", type: "dict", props: { dictCode: "user-type" } },
  { prop: "createUser", label: "由当前用户创建", width: 140 },
  {
    prop: "status",
    type: "dict-tag",
    props: { dictCode: "system-status" },
    width: 90,
  },
  { prop: "createTime", label: "创建时间", width: 180 },
  { prop: "updateTime", label: "更新时间", width: 180 },
]);

const [list, { page, loading, setLoading, loadList, reloadList, onChange }] =
  useTablePage(({ current, size }) =>
    User.page({
      ...form.value,
      pageNum: current,
      pageSize: size,
    }).then(({ data }) => ({
      records: data.records,
      total: data.total,
    })),
  );

const { selectionRows, setSelectionRows, clearSelectionRows } =
  useTableSelection<SystemUserType.User>();

const [tenantAllotVisible, setTenantAllotVisible] = useToggle();

const userAddRef = useTemplateRef("userAddRef");
const UserAreaRef = useTemplateRef("UserAreaRef");
const tenantAllotRef = useTemplateRef("tenantAllotRef");

const handleArea = (row: SystemUserType.User) => {
  UserAreaRef.value?.init(row.id);
};

const handleAdd = () => {
  userAddRef.value?.init();
};

const handleEdit = (data: UserTableModel) => {
  userAddRef.value?.initEdit(data);
};

const handleTenantAllot = (data: SystemUserType.User) => {
  setTenantAllotVisible(true);
  tenantAllotRef.value?.init(data);
};

const handleDel = async (data: SystemUserType.User) => {
  setLoading(true);
  try {
    const { message } = await User.remove(data.id);
    ElMessage.success(message);
    clearSelectionRows();
    reloadList();
  } catch (error) {
    console.error("error =>", error);
  } finally {
    setLoading(false);
  }
};

const handleBatchDel = async () => {
  if (selectionRows.length === 0) {
    ElMessage.warning("请至少勾选一条数据!");
    return;
  }
  setLoading(true);
  try {
    const { message } = await User.batchRemove(
      selectionRows.map((item) => item.id),
    );
    ElMessage.success(message);
    clearSelectionRows();
    reloadList();
  } catch (error) {
    console.error("error =>", error);
  } finally {
    setLoading(false);
  }
};

const handleResetPassword = async () => {
  if (selectionRows.length === 0) {
    ElMessage.warning("请至少勾选一条数据!");
    return;
  }
  setLoading(true);
  try {
    const { message } = await User.resetPassword(
      selectionRows.map((item) => item.id),
    );
    const data = await ConfigStore.loadConfig("user_passwd");
    ElMessage.success(`${message}, 已重置密码为${data}`);
    clearSelectionRows();
    reloadList();
  } catch (error) {
    console.error("error =>", error);
  } finally {
    setLoading(false);
  }
};

const handleReset = () => {
  resetForm();
  clearSelectionRows();
  reloadList();
};

const handleSubmitted = () => {
  clearSelectionRows();
  reloadList();
};

onMounted(loadList);
</script>

<template>
  <div class="user-manage">
    <GxPaginationTable
      v-model:page="page.current"
      v-model:limit="page.size"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="page.total"
      :table-props="{ selection: true, actionWidth: 300 }"
      @pagination="onChange"
      @selection-change="setSelectionRows"
    >
      <template #header>
        <GxSearch
          v-model="form"
          :items="searchItems"
          @submit="loadList"
          @reset="handleReset"
        />
      </template>

      <template #action-bar>
        <ElButton
          v-perm="['system:user:add']"
          type="primary"
          @click="handleAdd"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </ElButton>
        <ElPopconfirm
          title="是否批量删除勾选用户?"
          placement="right"
          @confirm="handleBatchDel"
        >
          <template #reference>
            <ElButton v-perm="['system:user:del:batch']" type="danger" plain>
              <Icon icon="ep:delete" class="mr-5px" /> 删除
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElPopconfirm
          width="200px"
          title="是否重置勾选的用户密码"
          placement="right"
          @confirm="handleResetPassword"
        >
          <template #reference>
            <ElButton v-perm="['system:user:passwd']" type="warning" plain>
              <Icon icon="carbon:reset" class="mr-5px" /> 重置密码
            </ElButton>
          </template>
        </ElPopconfirm>
      </template>

      <template #table-column-create-user="{ row }">
        {{ userStore.getUserId === row.createUser ? "是" : "否" }}
      </template>

      <template #action="{ row }">
        <ElButton
          v-perm="['system:user:edit']"
          type="primary"
          link
          @click="handleEdit(row)"
        >
          编辑
        </ElButton>
        <ElButton type="primary" link @click="handleArea(row)">
          管理区域
        </ElButton>
        <ElPopconfirm
          title="是否删除该用户?"
          placement="left"
          @confirm="handleDel(row)"
        >
          <template #reference>
            <ElButton v-perm="['system:user:del']" type="danger" link>
              删除
            </ElButton>
          </template>
        </ElPopconfirm>
        <ElButton
          v-perm="['system:tenant:user:allot']"
          type="primary"
          link
          @click="handleTenantAllot(row)"
        >
          分配租户
        </ElButton>
      </template>
    </GxPaginationTable>

    <UserAdd ref="userAddRef" @submitted="handleSubmitted" />
    <UserArea ref="UserAreaRef" />
    <TenantAllot
      ref="tenantAllotRef"
      v-model="tenantAllotVisible"
      @reset-table="reloadList"
    />
  </div>
</template>

<style lang="scss" scoped>
@import "@/styles/base-table";
</style>
