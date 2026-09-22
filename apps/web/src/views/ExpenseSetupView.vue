<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { AlertTriangle, Check, Pencil, Plus, ReceiptText, Search, Trash2, X } from 'lucide-vue-next';
import { api } from '../services/api';
import { expenseTypes as demoExpenseTypes, type ExpensePhase, type ExpenseTypeRecord } from '../data/expenses';
import { expenseHeadOptions } from '../data/sitePurchases';

interface ExpenseHead { id: number; name: string; status: 'active' | 'inactive'; usageCount: number }
type SetupKind = 'general' | 'engineer';

const tab = ref<SetupKind>('general');
const expenseTypes = ref<ExpenseTypeRecord[]>(demoExpenseTypes.map((item) => ({ ...item })));
const expenseHeads = ref<ExpenseHead[]>(expenseHeadOptions.map((item) => ({ id: item.id, name: item.name, status: 'active', usageCount: 0 })));
const search = ref('');
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const saved = ref('');
const editingId = ref<number | null>(null);
const typeForm = reactive({ name: '', phase: 'pre_award' as ExpensePhase, refundable: false, defaultRate: null as number | null, defaultAmount: null as number | null, defaultReturnAmount: null as number | null, active: true });
const headForm = reactive({ name: '', status: 'active' as 'active' | 'inactive' });
const deleteTarget = ref<{ kind: SetupKind; id: number; name: string; canDelete: boolean; references: number } | null>(null);
const deleteLoading = ref(false);
const deleting = ref(false);

async function loadSetup(showLoading = true) {
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  if (showLoading) loading.value = true;
  try {
    const [typesResult, headsResult] = await Promise.all([
      api<{ expenseTypes: ExpenseTypeRecord[] }>('/expenses/types'),
      api<{ expenseHeads: ExpenseHead[] }>('/site-purchases/expense-heads'),
    ]);
    expenseTypes.value = typesResult.expenseTypes;
    expenseHeads.value = headsResult.expenseHeads;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not load expense setup.'; }
  finally { if (showLoading) loading.value = false; }
}
onMounted(() => loadSetup());

const filteredTypes = computed(() => { const term = search.value.toLowerCase(); return expenseTypes.value.filter((item) => !term || item.name.toLowerCase().includes(term)); });
const filteredHeads = computed(() => { const term = search.value.toLowerCase(); return expenseHeads.value.filter((item) => !term || item.name.toLowerCase().includes(term)); });

function resetForm() {
  editingId.value = null; saved.value = ''; error.value = '';
  Object.assign(typeForm, { name: '', phase: 'pre_award', refundable: false, defaultRate: null, defaultAmount: null, defaultReturnAmount: null, active: true });
  Object.assign(headForm, { name: '', status: 'active' });
}
function editType(item: ExpenseTypeRecord) { tab.value = 'general'; editingId.value = item.id; Object.assign(typeForm, { name: item.name, phase: item.phase, refundable: item.refundable, defaultRate: item.defaultRate, defaultAmount: item.defaultAmount, defaultReturnAmount: item.defaultReturnAmount, active: item.active }); }
function editHead(item: ExpenseHead) { tab.value = 'engineer'; editingId.value = item.id; Object.assign(headForm, { name: item.name, status: item.status }); }

async function saveSetup() {
  error.value = ''; saved.value = '';
  if (tab.value === 'general' && !typeForm.name.trim()) { error.value = 'Enter the expense type name.'; return; }
  if (tab.value === 'engineer' && !headForm.name.trim()) { error.value = 'Enter the expense head name.'; return; }
  saving.value = true;
  try {
    if (tab.value === 'general') {
      const payload = { ...typeForm, name: typeForm.name.trim() };
      if (import.meta.env.VITE_DEMO_MODE === 'false') await api(editingId.value ? `/expenses/types/${editingId.value}` : '/expenses/types', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      else {
        const id = editingId.value ?? Math.max(0, ...expenseTypes.value.map((item) => item.id)) + 1;
        const record = { id, ...payload, usageCount: expenseTypes.value.find((item) => item.id === id)?.usageCount ?? 0 };
        const index = expenseTypes.value.findIndex((item) => item.id === id); if (index >= 0) expenseTypes.value[index] = record; else expenseTypes.value.unshift(record);
      }
    } else {
      const payload = { name: headForm.name.trim(), status: headForm.status };
      if (import.meta.env.VITE_DEMO_MODE === 'false') await api(editingId.value ? `/site-purchases/expense-heads/${editingId.value}` : '/site-purchases/expense-heads', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      else {
        const id = editingId.value ?? Math.max(0, ...expenseHeads.value.map((item) => item.id)) + 1;
        const record = { id, ...payload, usageCount: expenseHeads.value.find((item) => item.id === id)?.usageCount ?? 0 };
        const index = expenseHeads.value.findIndex((item) => item.id === id); if (index >= 0) expenseHeads.value[index] = record; else expenseHeads.value.unshift(record);
      }
    }
    if (import.meta.env.VITE_DEMO_MODE === 'false') await loadSetup(false);
    saved.value = editingId.value ? 'Setup updated.' : 'Setup added.'; resetForm(); saved.value = 'Saved successfully.';
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not save expense setup.'; }
  finally { saving.value = false; }
}

async function requestDelete(kind: SetupKind, item: ExpenseTypeRecord | ExpenseHead) {
  deleteTarget.value = { kind, id: item.id, name: item.name, canDelete: false, references: 0 };
  deleteLoading.value = true;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'false') {
      const result = kind === 'general'
        ? await api<{ canDelete: boolean; references: { expenseEntries: number } }>(`/expenses/types/${item.id}/delete-check`)
        : await api<{ canDelete: boolean; references: { siteExpenseEntries: number } }>(`/site-purchases/expense-heads/${item.id}/delete-check`);
      deleteTarget.value.canDelete = result.canDelete;
      deleteTarget.value.references = 'expenseEntries' in result.references ? result.references.expenseEntries : result.references.siteExpenseEntries;
    } else {
      deleteTarget.value.canDelete = item.usageCount === 0;
      deleteTarget.value.references = item.usageCount;
    }
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not check references.'; deleteTarget.value = null; }
  finally { deleteLoading.value = false; }
}

async function confirmDelete() {
  if (!deleteTarget.value?.canDelete) return;
  deleting.value = true;
  try {
    const target = deleteTarget.value;
    if (import.meta.env.VITE_DEMO_MODE === 'false') await api(target.kind === 'general' ? `/expenses/types/${target.id}` : `/site-purchases/expense-heads/${target.id}`, { method: 'DELETE' });
    const list = target.kind === 'general' ? expenseTypes.value : expenseHeads.value;
    const index = list.findIndex((item) => item.id === target.id); if (index >= 0) list.splice(index, 1);
    deleteTarget.value = null; resetForm();
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Could not delete this setup record.'; deleteTarget.value = null; }
  finally { deleting.value = false; }
}
</script>

<template>
  <section class="expense-setup-page">
    <div class="welcome-row projects-tools"><p>Maintain general expense types and site-engineer expense heads.</p><button class="secondary-button" @click="resetForm"><Plus :size="17" /> Clear form</button></div>
    <div class="setup-tabs"><button :class="{ active: tab === 'general' }" @click="tab = 'general'; resetForm()">General expense types <span>{{ expenseTypes.length }}</span></button><button :class="{ active: tab === 'engineer' }" @click="tab = 'engineer'; resetForm()">Engineer expense heads <span>{{ expenseHeads.length }}</span></button></div>
    <div class="expense-setup-layout">
      <form class="panel setup-entry-panel" @submit.prevent="saveSetup">
        <div class="panel-heading"><div><h2>{{ editingId ? 'Modify' : 'Add' }} {{ tab === 'general' ? 'expense type' : 'expense head' }}</h2><p>{{ tab === 'general' ? 'Used by pre-award and project vouchers.' : 'Used by site-engineer other-expense entries.' }}</p></div></div>
        <div v-if="tab === 'general'" class="setup-form-fields">
          <label class="form-field"><span>Expense name <b>*</b></span><div><ReceiptText :size="16" /><input v-model="typeForm.name" placeholder="Expense type name" /></div></label>
          <label class="form-field"><span>Cost stage</span><select v-model="typeForm.phase"><option value="pre_award">Before cost</option><option value="execution">Project cost</option></select></label>
          <label class="check-field"><input v-model="typeForm.refundable" type="checkbox" /><span><strong>Returnable by default</strong><small>Sets the default CTYPE value for new project-cost lines.</small></span></label>
          <div class="form-grid three"><label class="form-field"><span>Default rate</span><div><input v-model.number="typeForm.defaultRate" type="number" min="0" step="0.01" placeholder="0" /></div></label><label class="form-field"><span>Default amount</span><div><input v-model.number="typeForm.defaultAmount" type="number" min="0" step="0.01" placeholder="0" /></div></label><label class="form-field"><span>Default return</span><div><input v-model.number="typeForm.defaultReturnAmount" type="number" min="0" step="0.01" placeholder="0" /></div></label></div>
          <label class="check-field"><input v-model="typeForm.active" type="checkbox" /><span><strong>Active</strong><small>Available for new expense vouchers.</small></span></label>
        </div>
        <div v-else class="setup-form-fields"><label class="form-field"><span>Expense head name <b>*</b></span><div><ReceiptText :size="16" /><input v-model="headForm.name" placeholder="Site expense head" /></div></label><label class="form-field"><span>Status</span><select v-model="headForm.status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
        <p v-if="error" class="form-error">{{ error }}</p><p v-if="saved" class="save-success"><Check :size="16" />{{ saved }}</p>
        <div class="setup-form-actions"><button v-if="editingId" type="button" class="secondary-button" @click="resetForm">Cancel edit</button><button class="primary-button" :disabled="saving"><Check :size="16" />{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Add setup' }}</button></div>
      </form>
      <section class="panel setup-list-panel">
        <label class="table-search"><Search :size="16" /><input v-model="search" :placeholder="tab === 'general' ? 'Search expense types…' : 'Search engineer expense heads…'" /></label>
        <div v-if="loading" class="table-loading">Loading expense setup…</div>
        <div v-else class="setup-record-list">
          <article v-for="item in (tab === 'general' ? filteredTypes : filteredHeads)" :key="item.id"><div><strong>{{ item.name }}</strong><span v-if="tab === 'general'"><em>{{ (item as ExpenseTypeRecord).phase === 'pre_award' ? 'Before cost' : 'Project cost' }}</em><small>{{ (item as ExpenseTypeRecord).refundable ? 'Returnable' : 'Non-returnable' }}</small></span><span v-else><em>{{ (item as ExpenseHead).status }}</em><small>{{ item.usageCount }} entries</small></span></div><button class="card-edit" @click="tab === 'general' ? editType(item as ExpenseTypeRecord) : editHead(item as ExpenseHead)"><Pencil :size="14" /></button><button class="card-edit danger" @click="requestDelete(tab, item)"><Trash2 :size="14" /></button></article>
          <div v-if="!(tab === 'general' ? filteredTypes : filteredHeads).length" class="site-empty"><Search :size="22" /><strong>No setup records found</strong></div>
        </div>
      </section>
    </div>
    <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null"><section class="delete-modal"><button class="modal-close" @click="deleteTarget = null"><X :size="18" /></button><span class="delete-modal-icon"><AlertTriangle :size="24" /></span><h2>Delete “{{ deleteTarget.name }}”?</h2><p v-if="deleteLoading">Checking referenced expense entries…</p><template v-else-if="!deleteTarget.canDelete"><div class="delete-blocked"><AlertTriangle :size="18" /><span><strong>Deletion prevented</strong><small>{{ deleteTarget.references }} expense entries reference this record.</small></span></div><button class="secondary-button modal-done" @click="deleteTarget = null">Close</button></template><template v-else><p>No referenced expense entries were found.</p><div class="modal-actions"><button class="secondary-button" @click="deleteTarget = null">Cancel</button><button class="danger-button" :disabled="deleting" @click="confirmDelete"><Trash2 :size="16" />{{ deleting ? 'Deleting…' : 'Delete' }}</button></div></template></section></div>
  </section>
</template>
